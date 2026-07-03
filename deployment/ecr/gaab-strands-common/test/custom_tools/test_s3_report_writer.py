# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
from unittest.mock import patch

import boto3
import pytest
from gaab_strands_common.custom_tools.s3_report_writer import S3ReportWriterTool
from gaab_strands_common.custom_tools.setup.registry import CustomToolsRegistry
from moto import mock_aws

BUCKET = "test-bucket"
UUID = "test-use-case-uuid"


@pytest.fixture(autouse=True)
def clear_invocation_context():
    """Reports are conversation-scoped; keep tests deterministic"""
    from gaab_strands_common.utils.invocation_context import InvocationContext

    InvocationContext.set_conversation_id(None)
    yield
    InvocationContext.set_conversation_id(None)


@pytest.fixture(autouse=True)
def setup_environment(mock_environment):
    """Setup environment variables for all tests"""
    with patch.dict(
        os.environ,
        {
            "MULTIMODAL_DATA_BUCKET": BUCKET,
            "USE_CASE_UUID": UUID,
        },
        clear=False,
    ):
        yield


@pytest.fixture
def sample_config():
    """Sample configuration for testing"""
    return {"LlmParams": {"MultimodalParams": {"MultimodalEnabled": True}}}


@pytest.fixture
def tool(sample_config):
    """Create S3ReportWriterTool instance for testing"""
    return S3ReportWriterTool(sample_config, "us-east-1")


def _create_bucket():
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket=BUCKET)
    return s3


def _make_tool():
    """Instantiate the tool inside the active moto context"""
    return S3ReportWriterTool({"LlmParams": {"MultimodalParams": {"MultimodalEnabled": True}}}, "us-east-1")


def _text(result):
    return result["content"][0]["text"]


def test_registration_metadata():
    """Tool class carries registration metadata (registry singleton may be cleared by other tests)"""
    assert S3ReportWriterTool.metadata.tool_id == "s3_report_writer"
    assert hasattr(S3ReportWriterTool, "_auto_condition")
    assert hasattr(S3ReportWriterTool, "_requirements")


def test_registration_in_registry():
    """Tool must be discoverable via the registry after auto-discovery"""
    registry = CustomToolsRegistry()
    if "s3_report_writer" not in registry.get_all_tools():
        # another test cleared the singleton; re-import to re-register
        import importlib

        import gaab_strands_common.custom_tools.s3_report_writer as module

        importlib.reload(module)
    assert "s3_report_writer" in registry.get_all_tools()


def test_auto_attach_condition(sample_config):
    """Tool auto-attaches when multimodal is enabled and not otherwise"""
    condition = S3ReportWriterTool._auto_condition
    assert condition(sample_config) is True
    assert bool(condition({"LlmParams": {}})) is False


def test_initialization_missing_env_vars(sample_config):
    """Initialization fails without required environment variables"""
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="Missing required environment variables"):
            S3ReportWriterTool(sample_config, "us-east-1")


@mock_aws
def test_write_section_success():
    """Writing a section stores a markdown object under the report prefix"""
    s3 = _create_bucket()
    tool = _make_tool()

    result = tool.write_report_section("acme-2026", 1, "Sumário Executivo", "Conteúdo com acentuação — ok.")

    assert result["status"] == "success"
    key = f"{UUID}/reports/default/acme-2026/01-sumario-executivo.md"
    assert key in _text(result)
    body = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read().decode("utf-8")
    assert body.startswith("## Sumário Executivo")
    assert "acentuação — ok" in body


@mock_aws
def test_write_section_invalid_inputs():
    """Invalid report ids, section numbers and empty content are rejected"""
    _create_bucket()
    tool = _make_tool()

    assert tool.write_report_section("Bad_ID!", 1, "T", "c")["status"] == "error"
    assert tool.write_report_section("ok-id", 0, "T", "c")["status"] == "error"
    assert tool.write_report_section("ok-id", 1, "  ", "c")["status"] == "error"
    assert tool.write_report_section("ok-id", 1, "T", " ")["status"] == "error"


@mock_aws
def test_finalize_report_concatenates_in_order():
    """finalize_report assembles sections ordered by section number with title on top"""
    s3 = _create_bucket()
    tool = _make_tool()
    tool.write_report_section("acme-2026", 2, "Concorrentes", "Seção dois.")
    tool.write_report_section("acme-2026", 1, "O Mercado", "Seção um.")

    from gaab_strands_common.utils.download_links import DownloadLinkRegistry

    DownloadLinkRegistry.clear()
    result = tool.finalize_report("acme-2026", "Dossiê Acme")

    assert result["status"] == "success"
    text = _text(result)
    assert "2 section(s)" in text
    assert "https://" not in text  # URL must NOT pass through the model

    # The presigned URL is registered for machine-appended delivery instead
    links = DownloadLinkRegistry.drain()
    assert len(links) == 1
    assert "https://" in links[0]
    assert links[0].startswith("📄 [Baixar dossiê completo")

    final = s3.get_object(Bucket=BUCKET, Key=f"{UUID}/reports/default/acme-2026/final.md")["Body"].read().decode("utf-8")
    assert final.startswith("# Dossiê Acme")
    assert final.index("O Mercado") < final.index("Concorrentes")


@mock_aws
def test_finalize_report_without_sections():
    """finalize_report errors when no sections exist"""
    _create_bucket()
    tool = _make_tool()
    result = tool.finalize_report("vazio-2026", "Vazio")
    assert result["status"] == "error"
    assert "No sections found" in _text(result)


@mock_aws
def test_list_report_sections():
    """list_report_sections returns ordered keys and excludes final.md"""
    _create_bucket()
    tool = _make_tool()
    tool.write_report_section("acme-2026", 1, "Mercado", "a")
    tool.write_report_section("acme-2026", 2, "Riscos", "b")
    tool.finalize_report("acme-2026", "Dossiê")

    result = tool.list_report_sections("acme-2026")

    assert result["status"] == "success"
    text = _text(result)
    assert "01-mercado.md" in text
    assert "02-riscos.md" in text
    assert "final.md" not in text


@mock_aws
def test_write_section_overwrites_same_number():
    """Re-using a section number replaces that section"""
    s3 = _create_bucket()
    tool = _make_tool()
    tool.write_report_section("acme-2026", 1, "Mercado", "v1")
    tool.write_report_section("acme-2026", 1, "Mercado", "v2")

    keys = tool._list_section_keys("acme-2026")
    assert len(keys) == 1
    body = s3.get_object(Bucket=BUCKET, Key=keys[0])["Body"].read().decode("utf-8")
    assert "v2" in body


def test_s3_error_is_graceful(tool):
    """S3 client errors surface as error ToolResults, not exceptions"""
    from botocore.exceptions import ClientError

    with patch.object(
        tool.s3_client,
        "put_object",
        side_effect=ClientError({"Error": {"Code": "AccessDenied", "Message": "denied"}}, "PutObject"),
    ):
        result = tool.write_report_section("acme-2026", 1, "T", "c")
    assert result["status"] == "error"
    assert "AccessDenied" in _text(result)


@mock_aws
def test_report_scoped_by_conversation():
    """The same report_id in different conversations must not share sections"""
    from gaab_strands_common.utils.invocation_context import InvocationContext

    _create_bucket()
    tool = _make_tool()

    InvocationContext.set_conversation_id("aaaa1111-2222-3333-4444-555566667777")
    tool.write_report_section("acme-2026", 1, "Mercado", "conversa A")

    InvocationContext.set_conversation_id("bbbb8888-9999-0000-1111-222233334444")
    tool.write_report_section("acme-2026", 1, "Mercado", "conversa B")

    assert len(tool._list_section_keys("acme-2026")) == 1  # só a da conversa B
    keys_b = tool._list_section_keys("acme-2026")
    assert "/reports/aaaa1111/" not in keys_b[0]
    assert "/reports/bbbb8888/" in keys_b[0]

    InvocationContext.set_conversation_id("aaaa1111-2222-3333-4444-555566667777")
    keys_a = tool._list_section_keys("acme-2026")
    assert len(keys_a) == 1
    assert "/reports/aaaa1111/" in keys_a[0]
