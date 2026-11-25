param([Parameter(Mandatory = $true)][string]$InputFile)
$ErrorActionPreference = 'Stop'
$probeTimer = [Diagnostics.Stopwatch]::StartNew()
$probeProgress = [IO.Path]::ChangeExtension($InputFile, '.progress.json')
function Write-ProbeProgress([string]$Stage) {
    $value = [ordered]@{ stage = $Stage; elapsedMs = $probeTimer.ElapsedMilliseconds } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText($probeProgress, $value, [Text.UTF8Encoding]::new($false))
}
Write-ProbeProgress 'drawing-load'
Add-Type -AssemblyName System.Drawing
Write-ProbeProgress 'native-compile'
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;

public static class WindowsIconProbe {
    [StructLayout(LayoutKind.Sequential)] public struct PropertyKey {
        public Guid format;
        public uint id;
        public PropertyKey(uint value) { format = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"); id = value; }
    }
    [StructLayout(LayoutKind.Explicit, Size = 24)] public struct PropVariant {
        [FieldOffset(0)] public ushort type;
        [FieldOffset(8)] public IntPtr value;
    }
    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IPropertyStore {
        void GetCount(out uint count);
        void GetAt(uint index, out PropertyKey key);
        void GetValue(ref PropertyKey key, out PropVariant value);
        void SetValue(ref PropertyKey key, ref PropVariant value);
        void Commit();
    }
    [DllImport("shell32.dll", PreserveSig = false)] static extern void SHGetPropertyStoreForWindow(IntPtr window, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IPropertyStore store);
    [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropVariant value);
    [DllImport("user32.dll", SetLastError = true)] static extern IntPtr SendMessageTimeout(IntPtr window, uint message, IntPtr wparam, IntPtr lparam, uint flags, uint timeout, out IntPtr result);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr LoadImage(IntPtr instance, string file, uint type, int width, int height, uint flags);
    [DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr icon);

    public static string Property(long window, uint id) {
        Guid iid = typeof(IPropertyStore).GUID;
        IPropertyStore store;
        SHGetPropertyStoreForWindow(new IntPtr(window), ref iid, out store);
        try {
            PropertyKey key = new PropertyKey(id);
            PropVariant value;
            store.GetValue(ref key, out value);
            try { return value.type == 31 ? Marshal.PtrToStringUni(value.value) : null; }
            finally { PropVariantClear(ref value); }
        } finally { Marshal.ReleaseComObject(store); }
    }
    static string Fingerprint(IntPtr icon, string file) {
        using (Bitmap bitmap = Icon.FromHandle(icon).ToBitmap()) {
            bitmap.Save(file, System.Drawing.Imaging.ImageFormat.Png);
            using (SHA256 hash = SHA256.Create()) return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(file)));
        }
    }
    public static bool Matches(long window, int kind, string expected, string directory) {
        IntPtr actual;
        if (SendMessageTimeout(new IntPtr(window), 0x7F, new IntPtr(kind), IntPtr.Zero, 2, 1000, out actual) == IntPtr.Zero || actual == IntPtr.Zero)
            throw new Exception("Native window icon missing or unresponsive");
        int width, height;
        using (Bitmap bitmap = Icon.FromHandle(actual).ToBitmap()) { width = bitmap.Width; height = bitmap.Height; }
        IntPtr reference = LoadImage(IntPtr.Zero, expected, 1, width, height, 0x10);
        if (reference == IntPtr.Zero) throw new Exception("Cannot load reference ICO");
        try {
            return Fingerprint(actual, Path.Combine(directory, "actual-" + kind + ".png")) ==
                   Fingerprint(reference, Path.Combine(directory, "expected-" + kind + ".png"));
        } finally { DestroyIcon(reference); }
    }
}
'@
$inputData = Get-Content -Raw -LiteralPath $InputFile | ConvertFrom-Json
$evidence = Split-Path -Parent $InputFile
Write-ProbeProgress 'app-id'
$taskbarId = [WindowsIconProbe]::Property([long]$inputData.handle, 5)
Write-ProbeProgress 'icon-resource'
$iconResource = [WindowsIconProbe]::Property([long]$inputData.handle, 3)
Write-ProbeProgress 'small-icon'
$smallMatches = [WindowsIconProbe]::Matches([long]$inputData.handle, 0, $inputData.reference, $evidence)
Write-ProbeProgress 'large-icon'
$largeMatches = [WindowsIconProbe]::Matches([long]$inputData.handle, 1, $inputData.reference, $evidence)
Write-ProbeProgress 'complete'
[ordered]@{
    appId = $taskbarId
    iconResource = $iconResource
    smallMatches = $smallMatches
    largeMatches = $largeMatches
} | ConvertTo-Json -Compress
