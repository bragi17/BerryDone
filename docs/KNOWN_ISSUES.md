# 已知问题和警告

## DevTools Autofill 警告

当打开 DevTools 时，你可能会看到以下警告：

```
[ERROR:CONSOLE:1] "Request Autofill.enable failed. {"code":-32601,"message":"'Autofill.enable' wasn't found"}"
[ERROR:CONSOLE:1] "Request Autofill.setAddresses failed. {"code":-32601,"message":"'Autofill.setAddresses' wasn't found"}"
```

**这不是应用程序的错误**，而是 Electron DevTools 的已知问题。这些警告可以安全地忽略，不会影响应用程序的功能。

### 原因
这是因为 Electron 的 DevTools 尝试启用 Autofill API，但这个 API 在某些版本的 Electron 中不可用。

### 影响
无。这些警告不会影响应用程序的任何功能。

### 解决方案
无需解决。可以忽略这些警告。

---

## 其他已知问题

目前没有其他已知的重大问题。
