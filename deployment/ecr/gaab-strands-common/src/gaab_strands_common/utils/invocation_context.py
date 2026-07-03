# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Per-invocation context shared between the runtime entrypoint and tools.

The AgentCore entrypoint receives identifiers (e.g. the conversation id) that tools
need but that do not flow through the Strands tool-call interface. The entrypoint
stores them here at the start of each invocation; tools read them to scope the
resources they create (e.g. report objects namespaced per conversation).
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

_SCOPE_SANITIZER = re.compile(r"[^a-z0-9-]")


class InvocationContext:
    """Singleton holding identifiers of the current invocation"""

    _conversation_id: Optional[str] = None

    @classmethod
    def set_conversation_id(cls, conversation_id: Optional[str]) -> None:
        """Store the conversation id of the current invocation"""
        cls._conversation_id = conversation_id

    @classmethod
    def get_conversation_id(cls) -> Optional[str]:
        """Return the conversation id of the current invocation, if known"""
        return cls._conversation_id

    @classmethod
    def get_conversation_scope(cls) -> str:
        """
        Return a short filesystem-safe scope segment derived from the conversation id,
        for namespacing per-conversation resources. Falls back to 'default' when the
        conversation id is unknown.
        """
        if not cls._conversation_id:
            return "default"
        return _SCOPE_SANITIZER.sub("", cls._conversation_id.lower())[:8] or "default"
