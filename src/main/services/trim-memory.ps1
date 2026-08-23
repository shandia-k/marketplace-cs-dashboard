# Native Win32 Memory Working Set Trimmer for Windows
$code = @"
using System;
using System.Runtime.InteropServices;

public class Win32MemTrimmer {
    [DllImport("psapi.dll", SetLastError = true)]
    public static extern bool EmptyWorkingSet(IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    const uint PROCESS_QUERY_INFORMATION = 0x0400;
    const uint PROCESS_SET_QUOTA = 0x0100;

    public static void TrimPid(int pid) {
        IntPtr h = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA, false, pid);
        if (h != IntPtr.Zero) {
            try {
                EmptyWorkingSet(h);
            } finally {
                CloseHandle(h);
            }
        }
    }
}
"@

try {
    Add-Type -TypeDefinition $code -Language CSharp -ErrorAction SilentlyContinue
} catch {}

$procs = Get-Process -Name electron -ErrorAction SilentlyContinue
foreach ($p in $procs) {
    try {
        [Win32MemTrimmer]::TrimPid($p.Id)
    } catch {}
}
