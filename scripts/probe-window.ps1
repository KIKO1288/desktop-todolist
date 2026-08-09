param(
  [string]$Title = '桌面清单'
)

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class WindowProbe {
  public delegate bool EnumWindowProc(IntPtr hwnd, IntPtr lParam);

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll")]
  private static extern bool EnumWindows(EnumWindowProc callback, IntPtr lParam);

  [DllImport("user32.dll")]
  private static extern bool EnumChildWindows(IntPtr parent, EnumWindowProc callback, IntPtr lParam);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  private static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int maxCount);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  private static extern int GetClassName(IntPtr hwnd, StringBuilder text, int maxCount);

  [DllImport("user32.dll")]
  private static extern IntPtr GetParent(IntPtr hwnd);

  [DllImport("user32.dll")]
  private static extern bool IsWindowVisible(IntPtr hwnd);

  [DllImport("user32.dll")]
  private static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);

  [DllImport("user32.dll")]
  private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);

  private static readonly HashSet<IntPtr> Seen = new HashSet<IntPtr>();
  private static readonly List<Dictionary<string, object>> Matches = new List<Dictionary<string, object>>();
  private static string WantedTitle;

  private static void Inspect(IntPtr hwnd) {
    if (!Seen.Add(hwnd)) return;
    var text = new StringBuilder(512);
    GetWindowText(hwnd, text, text.Capacity);
    if (text.ToString() != WantedTitle) return;

    var className = new StringBuilder(256);
    GetClassName(hwnd, className, className.Capacity);
    RECT rect;
    GetWindowRect(hwnd, out rect);
    uint processId;
    GetWindowThreadProcessId(hwnd, out processId);
    Matches.Add(new Dictionary<string, object> {
      { "handle", hwnd.ToInt64() },
      { "parent", GetParent(hwnd).ToInt64() },
      { "visible", IsWindowVisible(hwnd) },
      { "className", className.ToString() },
      { "processId", processId },
      { "x", rect.Left },
      { "y", rect.Top },
      { "width", rect.Right - rect.Left },
      { "height", rect.Bottom - rect.Top }
    });
  }

  public static object[] Find(string title) {
    WantedTitle = title;
    Seen.Clear();
    Matches.Clear();
    EnumWindows((top, value) => {
      Inspect(top);
      EnumChildWindows(top, (child, childValue) => {
        Inspect(child);
        return true;
      }, IntPtr.Zero);
      return true;
    }, IntPtr.Zero);
    return Matches.ToArray();
  }
}
'@

[WindowProbe]::Find($Title) | ConvertTo-Json -Depth 4
