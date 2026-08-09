param(
  [Parameter(Mandatory = $true)]
  [Int64]$Handle,

  [ValidateSet('Attach', 'Detach')]
  [string]$Mode = 'Attach'
)

$source = @'
using System;
using System.Runtime.InteropServices;

public static class DesktopLayer
{
    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr childAfter, string className, string windowName);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetParent(IntPtr child, IntPtr newParent);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr GetParent(IntPtr child);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int index, IntPtr value);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);

    private static readonly IntPtr HWND_TOP = IntPtr.Zero;
    private const uint SMTO_NORMAL = 0x0000;
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_FRAMECHANGED = 0x0020;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const uint SWP_SHOWWINDOW = 0x0040;
    private const int GWL_STYLE = -16;
    private const long WS_CHILD = 0x40000000L;
    private const long WS_POPUP = 0x80000000L;

    public static long LastTarget { get; private set; }
    public static long LastParent { get; private set; }
    public static int LastError { get; private set; }

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static bool Attach(IntPtr child)
    {
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) return false;

        IntPtr ignored;
        SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(0x1), SMTO_NORMAL, 1000, out ignored);
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, SMTO_NORMAL, 1000, out ignored);

        IntPtr worker = IntPtr.Zero;
        EnumWindows(delegate(IntPtr top, IntPtr param)
        {
            IntPtr shellView = FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (shellView != IntPtr.Zero)
            {
                worker = FindWindowEx(IntPtr.Zero, top, "WorkerW", null);
            }
            return true;
        }, IntPtr.Zero);

        if (worker == IntPtr.Zero) worker = progman;
        long style = GetWindowLongPtr(child, GWL_STYLE).ToInt64();
        style = (style & ~WS_POPUP) | WS_CHILD;
        SetWindowLongPtr(child, GWL_STYLE, new IntPtr(style));
        SetParent(child, worker);
        LastError = Marshal.GetLastWin32Error();
        // On current Windows 11 builds the WorkerW lookup can legitimately fall
        // back to Progman. SHELLDLL_DefView is an opaque, full-screen child of
        // Progman, so inserting our window at HWND_BOTTOM makes it run while
        // remaining completely hidden behind the desktop view. Keep the note at
        // the top of its desktop parent instead. Progman/WorkerW themselves are
        // still below ordinary top-level application windows.
        bool positioned = SetWindowPos(child, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_SHOWWINDOW);
        if (!positioned)
        {
            LastError = Marshal.GetLastWin32Error();
            return false;
        }
        IntPtr actualParent = GetParent(child);
        LastTarget = worker.ToInt64();
        LastParent = actualParent.ToInt64();
        return actualParent == worker;
    }

    public static bool Detach(IntPtr child)
    {
        RECT rect;
        if (!GetWindowRect(child, out rect))
        {
            LastError = Marshal.GetLastWin32Error();
            return false;
        }

        SetParent(child, IntPtr.Zero);
        long style = GetWindowLongPtr(child, GWL_STYLE).ToInt64();
        style = (style & ~WS_CHILD) | WS_POPUP;
        SetWindowLongPtr(child, GWL_STYLE, new IntPtr(style));

        int width = Math.Max(1, rect.Right - rect.Left);
        int height = Math.Max(1, rect.Bottom - rect.Top);
        bool positioned = SetWindowPos(child, HWND_TOP, rect.Left, rect.Top, width, height, SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_SHOWWINDOW);
        if (!positioned)
        {
            LastError = Marshal.GetLastWin32Error();
            return false;
        }

        IntPtr actualParent = GetParent(child);
        LastTarget = 0;
        LastParent = actualParent.ToInt64();
        return actualParent == IntPtr.Zero;
    }
}
'@

try {
  Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
  $ok = if ($Mode -eq 'Detach') {
    [DesktopLayer]::Detach([IntPtr]$Handle)
  } else {
    [DesktopLayer]::Attach([IntPtr]$Handle)
  }
  if ($ok) {
    if ($Mode -eq 'Detach') {
      Write-Output "DETACHED"
    } else {
      Write-Output "ATTACHED target=$([DesktopLayer]::LastTarget)"
    }
    exit 0
  }
  Write-Error "Window mode transition failed. mode=$Mode target=$([DesktopLayer]::LastTarget) actual=$([DesktopLayer]::LastParent) error=$([DesktopLayer]::LastError)"
  exit 1
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
