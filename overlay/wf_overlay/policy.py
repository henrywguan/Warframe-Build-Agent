"""Hard policy: the overlay is fully external to the Warframe process.

Allowed:
- Own always-on-top UI window
- OS screen capture of user-selected regions (pixels only)
- Local files under the user's config/captures directories
- Public web/API data and rule-based recommendations

Forbidden (never implement):
- Reading or writing Warframe process memory
- Injecting DLLs, hooks, overlays into the game process
- Automating Warframe inputs (send keys/clicks into the game)
- Packet inspection / traffic tampering
- Any trainer-style tooling

If a future feature needs game-state insight, it must come from:
- user-visible screenshots / OCR, or
- manual user input, or
- public APIs / docs
— never from the game's address space.
"""

from __future__ import annotations

EXTERNAL_ONLY = True

ALLOWED_INPUT_SURFACES = (
    "screen_pixels",
    "manual_user_input",
    "local_config_files",
    "public_http_apis",
)

FORBIDDEN_TECHNIQUES = (
    "process_memory_read",
    "process_memory_write",
    "dll_injection",
    "game_input_automation",
    "network_tampering",
    "debug_attach",
)

# Top-level modules that must never be importable while the overlay runs.
FORBIDDEN_IMPORT_ROOTS = frozenset(
    {
        "pymem",
        "frida",
        "pyinjector",
        "readwritememory",
        "processmemory",
        "cheatengine",
        "mem_edit",
        "memedit",
        "pymemorymodule",
        "injection",
    }
)

# Dependency name fragments banned from requirements.txt / installed env checks.
FORBIDDEN_DEPENDENCY_NAMES = frozenset(
    {
        "pymem",
        "frida",
        "cheatengine",
        "pyinjector",
        "injection",
        "readwritememory",
        "processmemory",
        "mem-edit",
        "mem_edit",
        "pymemorymodule",
    }
)

# Snippets that must never appear in overlay application source.
FORBIDDEN_SOURCE_SNIPPETS = (
    "import pymem",
    "from pymem",
    "import frida",
    "from frida",
    "ReadProcessMemory",
    "WriteProcessMemory",
    "OpenProcess(",
    "process_vm_readv",
    "process_vm_writev",
    "PTRACE_PEEKDATA",
    "PTRACE_POKEDATA",
    "ptrace(",
    "/proc/",
    "VirtualAllocEx",
    "WriteProcessMemory",
    "CreateRemoteThread",
    "NtReadVirtualMemory",
    "NtWriteVirtualMemory",
    "MachVMRead",
    "task_for_pid",
    "ctypes.windll",
    "ctypes.cdll.LoadLibrary",
    "windll.kernel32",
)

# Our package must not import these stdlib/tools for process intrusion.
FORBIDDEN_LOCAL_IMPORTS = frozenset(
    {
        "ctypes",
        "cffi",
        "pymem",
        "frida",
    }
)


def assert_external_only() -> None:
    if not EXTERNAL_ONLY:
        raise RuntimeError("Overlay policy violated: EXTERNAL_ONLY must remain True")
