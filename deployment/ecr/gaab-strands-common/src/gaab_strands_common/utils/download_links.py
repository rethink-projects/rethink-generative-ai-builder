# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Registry for machine-generated download links.

Presigned URLs are too long for the model to transcribe reliably into its final
message (a single altered character invalidates the signature). Tools register
ready-to-render markdown lines here, and the runtime streaming layer appends them
to the response as their own content chunks, bypassing the model entirely.
"""

import logging
from typing import List

logger = logging.getLogger(__name__)


class DownloadLinkRegistry:
    """
    Singleton queue of markdown download lines produced by tools during the
    current invocation. Drained by the streaming layer at the end of the response.
    """

    _instance = None
    _links: List[str] = []

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._links = []
        return cls._instance

    @classmethod
    def add(cls, markdown_line: str) -> None:
        """Register a markdown line (e.g. a download link) to append to the response"""
        cls._links.append(markdown_line)
        logger.info("[DOWNLOAD_LINK] Registered download link for streaming append")

    @classmethod
    def drain(cls) -> List[str]:
        """Get all registered lines and clear the queue"""
        links = cls._links.copy()
        cls._links.clear()
        return links

    @classmethod
    def clear(cls) -> None:
        """Clear all registered lines"""
        cls._links.clear()
