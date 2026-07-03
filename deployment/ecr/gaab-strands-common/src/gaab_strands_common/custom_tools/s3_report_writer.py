# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
S3 Report Writer tool for progressive long-form report generation.

Long reports exceed the model's single-message output token budget. This tool lets the
agent write each report section to S3 as it is produced (one object per section), then
assemble the final document and hand the user a presigned download link, keeping chat
responses short.
"""

import logging
import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Dict, List

import boto3
from botocore.exceptions import ClientError
from strands import tool
from strands.types.tools import ToolResult

from ..utils.constants import MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR, USE_CASE_UUID
from .setup import BaseCustomTool, auto_attach_when, custom_tool, requires
from .setup.metadata import ToolCategory

logger = logging.getLogger(__name__)

REPORTS_PREFIX = "reports"
MAX_SECTION_CONTENT_CHARS = 200_000
PRESIGNED_URL_EXPIRY_SECONDS = 3600
IDENTIFIER_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,127}$")


@custom_tool(
    tool_id="s3_report_writer",
    name="S3 Report Writer",
    description="Write long report sections progressively to S3 and deliver a final downloadable file",
    category=ToolCategory.GENERAL,
)
@requires(
    config_params=["LlmParams.MultimodalParams.MultimodalEnabled"],
    env_vars=[MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR, USE_CASE_UUID],
)
@auto_attach_when(
    lambda config: config.get("LlmParams", {}).get("MultimodalParams", {}).get("MultimodalEnabled", False)
)
class S3ReportWriterTool(BaseCustomTool):
    """
    S3 Report Writer tool that automatically attaches when multimodal is enabled
    (the multimodal data bucket is the working area for generated reports)
    """

    def __init__(self, config: Dict[str, Any], region: str):
        super().__init__(config, region)
        self.bucket_name = os.getenv(MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR)
        self.use_case_uuid = os.getenv(USE_CASE_UUID)
        self.s3_client = boto3.client("s3", region_name=self.region)

        logger.debug(f"Initialized S3ReportWriterTool for bucket: {self.bucket_name}")

    @tool
    def write_report_section(
        self, report_id: str, section_number: int, section_title: str, section_content: str
    ) -> ToolResult:
        """
        Write one section of a long report to S3. Call this once per section as soon as
        the section is ready, instead of accumulating the whole report in the chat.

        Args:
            report_id (str, required): Stable identifier for this report, lowercase letters,
                digits and hyphens only (e.g., 'acme-mercado-2026-07-03'). Use the same value
                for every section of the same report.
            section_number (int, required): Section order starting at 1. Re-using a number
                overwrites that section.
            section_title (str, required): Human readable section title (used as the heading).
            section_content (str, required): Full Markdown content of the section (without the
                top-level heading; it is added automatically from section_title).

        Returns:
            ToolResult with status "success" (S3 key of the stored section) or "error".
        """
        tool_use_id = f"write_report_section_{abs(hash((report_id, section_number))) % 10000}"
        try:
            error = self._validate_report_id(report_id)
            if error:
                return self._create_error_result(tool_use_id, error)

            if not isinstance(section_number, int) or section_number < 1 or section_number > 99:
                return self._create_error_result(tool_use_id, "section_number must be an integer between 1 and 99")

            if not isinstance(section_title, str) or not section_title.strip():
                return self._create_error_result(tool_use_id, "section_title cannot be empty")

            if not isinstance(section_content, str) or not section_content.strip():
                return self._create_error_result(tool_use_id, "section_content cannot be empty")

            if len(section_content) > MAX_SECTION_CONTENT_CHARS:
                return self._create_error_result(
                    tool_use_id,
                    f"section_content exceeds {MAX_SECTION_CONTENT_CHARS} characters; split it into smaller sections",
                )

            slug = self._slugify(section_title)
            s3_key = f"{self.use_case_uuid}/{REPORTS_PREFIX}/{report_id}/{section_number:02d}-{slug}.md"
            body = f"## {section_title.strip()}\n\n{section_content.strip()}\n"

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=body.encode("utf-8"),
                ContentType="text/markdown; charset=utf-8",
            )

            logger.info(f"Wrote report section {section_number} ({len(body)} chars) to s3://{self.bucket_name}/{s3_key}")

            return {
                "toolUseId": tool_use_id,
                "status": "success",
                "content": [{"text": f"Section {section_number} '{section_title.strip()}' stored at key: {s3_key}"}],
            }
        except ClientError as e:
            return self._client_error_result(tool_use_id, e, "writing report section")
        except Exception as e:
            logger.error(f"Unexpected error writing report section: {str(e)}")
            return self._create_error_result(tool_use_id, f"Unexpected error writing report section: {str(e)}")

    @tool
    def finalize_report(self, report_id: str, report_title: str) -> ToolResult:
        """
        Assemble all stored sections of a report (in section_number order) into a single
        Markdown file and return a presigned download URL valid for one hour. Call this
        exactly once, after every section has been written with write_report_section.

        Args:
            report_id (str, required): The report identifier used in write_report_section.
            report_title (str, required): Title placed at the top of the final document.

        Returns:
            ToolResult with status "success" (final S3 key, section count and a presigned
            download URL to share with the user as a Markdown link) or "error".
        """
        tool_use_id = f"finalize_report_{abs(hash(report_id)) % 10000}"
        try:
            error = self._validate_report_id(report_id)
            if error:
                return self._create_error_result(tool_use_id, error)

            if not isinstance(report_title, str) or not report_title.strip():
                return self._create_error_result(tool_use_id, "report_title cannot be empty")

            section_keys = self._list_section_keys(report_id)
            if not section_keys:
                return self._create_error_result(
                    tool_use_id, f"No sections found for report '{report_id}'. Write sections first."
                )

            generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            parts: List[str] = [f"# {report_title.strip()}\n\n_Gerado em {generated_at}_\n"]
            for key in section_keys:
                obj = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
                parts.append(obj["Body"].read().decode("utf-8").strip())

            final_key = f"{self.use_case_uuid}/{REPORTS_PREFIX}/{report_id}/final.md"
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=final_key,
                Body="\n\n".join(parts).encode("utf-8"),
                ContentType="text/markdown; charset=utf-8",
            )

            download_url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": final_key,
                    "ResponseContentDisposition": f'attachment; filename="{report_id}.md"',
                },
                ExpiresIn=PRESIGNED_URL_EXPIRY_SECONDS,
            )

            logger.info(f"Finalized report '{report_id}' with {len(section_keys)} section(s) at {final_key}")

            return {
                "toolUseId": tool_use_id,
                "status": "success",
                "content": [
                    {
                        "text": (
                            f"Report assembled from {len(section_keys)} section(s) at key: {final_key}\n"
                            f"Share this download link with the user (valid for 1 hour):\n{download_url}"
                        )
                    }
                ],
            }
        except ClientError as e:
            return self._client_error_result(tool_use_id, e, "finalizing report")
        except Exception as e:
            logger.error(f"Unexpected error finalizing report: {str(e)}")
            return self._create_error_result(tool_use_id, f"Unexpected error finalizing report: {str(e)}")

    @tool
    def list_report_sections(self, report_id: str) -> ToolResult:
        """
        List the sections already written for a report, in order. Useful to check progress
        or resume after an interruption.

        Args:
            report_id (str, required): The report identifier used in write_report_section.

        Returns:
            ToolResult with the ordered list of stored section keys (may be empty).
        """
        tool_use_id = f"list_report_sections_{abs(hash(report_id)) % 10000}"
        try:
            error = self._validate_report_id(report_id)
            if error:
                return self._create_error_result(tool_use_id, error)

            section_keys = self._list_section_keys(report_id)
            listing = "\n".join(section_keys) if section_keys else "(no sections yet)"
            return {
                "toolUseId": tool_use_id,
                "status": "success",
                "content": [{"text": f"Sections stored for report '{report_id}':\n{listing}"}],
            }
        except ClientError as e:
            return self._client_error_result(tool_use_id, e, "listing report sections")
        except Exception as e:
            logger.error(f"Unexpected error listing report sections: {str(e)}")
            return self._create_error_result(tool_use_id, f"Unexpected error listing report sections: {str(e)}")

    def _list_section_keys(self, report_id: str) -> List[str]:
        """List section object keys for a report, ordered by section number prefix."""
        prefix = f"{self.use_case_uuid}/{REPORTS_PREFIX}/{report_id}/"
        keys: List[str] = []
        paginator = self.s3_client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
            for obj in page.get("Contents", []):
                name = obj["Key"].rsplit("/", 1)[-1]
                if name != "final.md" and name.endswith(".md"):
                    keys.append(obj["Key"])
        return sorted(keys)

    def _validate_report_id(self, report_id: str) -> str:
        """Return an error message when report_id is invalid, empty string otherwise."""
        if not isinstance(report_id, str) or not IDENTIFIER_PATTERN.match(report_id or ""):
            return (
                "report_id must contain only lowercase letters, digits and hyphens "
                "(e.g., 'acme-mercado-2026-07-03')"
            )
        return ""

    def _slugify(self, title: str) -> str:
        """Build a short filesystem-safe slug from a section title."""
        ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
        normalized = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
        return (normalized or "secao")[:48]

    def _client_error_result(self, tool_use_id: str, error: ClientError, action: str) -> ToolResult:
        error_code = error.response.get("Error", {}).get("Code", "Unknown")
        error_message = error.response.get("Error", {}).get("Message", str(error))
        logger.error(f"S3 ClientError {action}: {error_code} - {error_message}")
        return self._create_error_result(tool_use_id, f"Error {action}: {error_code} - {error_message}")

    def _create_error_result(self, tool_use_id: str, error_message: str) -> ToolResult:
        """Create a ToolResult for error cases."""
        return {
            "toolUseId": tool_use_id,
            "status": "error",
            "content": [{"text": error_message}],
        }
