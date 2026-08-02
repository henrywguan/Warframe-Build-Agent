"""Hard policy: the overlay is fully external to the Warframe process.

Allowed:
- Own always-on-top UI window (separate OS process / window)
- OS desktop capture of user-selected regions (pixels only)
- Local files under the user's config/captures directories
- Public web/API data and rule-based recommendations
- Clickable overlay buttons (preferred UX)
- Window-scoped hotkeys on our own overlay window
- Optional OS-registered global hotkeys (Windows RegisterHotKey only)

Forbidden (never implement):
- Reading or writing Warframe process memory
- Injecting DLLs, hooks, or rendering into the game process
- Automating Warframe inputs (send keys/clicks into the game)
- Global low-level input hooks (SetWindowsHookEx / pynput-style)
- Process enumeration / opening handles to Warframe
- Packet inspection / traffic tampering
- Any trainer-style tooling
- Running with admin/root elevation

Anti-cheat note:
No third-party tool can guarantee Easy Anti-Cheat / Warframe will never
false-positive. These rules keep this app in the lowest-risk class:
a normal external window + optional desktop screenshots, with zero contact
with the Warframe process.
"""

from __future__ import annotations

EXTERNAL_ONLY = True
ANTICHEAT_RISK_REDUCTION = True
REFUSE_ELEVATED_PROCESS = True

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
    "graphics_api_injection",
    "game_input_automation",
    "global_input_hooks",
    "process_handle_open",
    "process_enumeration_for_game",
    "network_tampering",
    "debug_attach",
    "elevated_privilege_requirement",
)

# Top-level modules that must never be importable while the overlay runs.
FORBIDDEN_IMPORT_ROOTS = frozenset(
    {
        # Memory / injection
        "pymem",
        "frida",
        "pyinjector",
        "readwritememory",
        "processmemory",
        "cheatengine",
        "mem_edit",
        "memedit",
        "pymemorymodule",
        # Input automation / global hooks
        "pynput",
        "keyboard",
        "mouse",
        "pyautogui",
        "pywinauto",
        "autopy",
        # Process inspection helpers often used before memory reads
        "psutil",
        "win32api",
        "win32process",
        "win32gui",
        "win32con",
        # Invasive / game-oriented capture stacks (prefer OS desktop capture only)
        "dxcam",
        "bettercam",
    }
)

# Dependency name fragments banned from requirements.txt / installed env checks.
FORBIDDEN_DEPENDENCY_NAMES = frozenset(
    {
        "pymem",
        "frida",
        "cheatengine",
        "pyinjector",
        "readwritememory",
        "processmemory",
        "mem-edit",
        "mem_edit",
        "pymemorymodule",
        "pynput",
        "keyboard",
        "mouse",
        "pyautogui",
        "pywinauto",
        "autopy",
        "psutil",
        "pywin32",
        "dxcam",
        "bettercam",
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
    "CreateRemoteThread",
    "NtReadVirtualMemory",
    "NtWriteVirtualMemory",
    "MachVMRead",
    "task_for_pid",
    "ctypes.windll",
    "ctypes.cdll.LoadLibrary",
    "windll.kernel32",
    "SetWindowsHookEx",
    "SendInput(",
    "mouse_event(",
    "keybd_event(",
    "EnumProcesses(",
    "CreateToolhelp32Snapshot",
    "Warframe.x64.exe",
    "Warframe.exe",
)

# Our package must not import these stdlib/tools for process intrusion.
FORBIDDEN_LOCAL_IMPORTS = frozenset(
    {
        "ctypes",
        "cffi",
        "pymem",
        "frida",
        "psutil",
        "pynput",
        "keyboard",
        "mouse",
        "pyautogui",
    }
)


def assert_external_only() -> None:
    if not EXTERNAL_ONLY:
        raise RuntimeError("Overlay policy violated: EXTERNAL_ONLY must remain True")
    if not ANTICHEAT_RISK_REDUCTION:
        raise RuntimeError(
            "Overlay policy violated: ANTICHEAT_RISK_REDUCTION must remain True"
        )
