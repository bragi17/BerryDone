# 临时脚本：删除旧的工时设置面板代码
$file = "src\renderer\src\views\Commissions.vue"
$content = Get-Content $file -Raw

# 定义要删除的代码块的开始和结束标记
$startMarker = "    <!-- 工时批量设置面板 -->"
$endMarker = "    </div>`r`n`r`n    <div v-if=`"loading`""

# 找到并删除代码块
$pattern = [regex]::Escape($startMarker) + "[\s\S]*?" + "    </div>`r`n`r`n(?=    <div v-if=`"loading`")"
$content = $content -replace $pattern, ""

# 写回文件
$content | Set-Content $file -NoNewline
Write-Host "已删除旧的面板代码"
