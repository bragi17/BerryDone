<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NIcon, NInput, useMessage } from 'naive-ui'
import { AddCircleOutline, CloseCircleOutline, CopyOutline } from '@vicons/ionicons5'

interface QuickReply {
  id: string
  text: string
}

const message = useMessage()
const replies = ref<QuickReply[]>([])
const newReplyText = ref('')
const isAdding = ref(false)

// 加载快捷回复
const loadReplies = () => {
  const saved = localStorage.getItem('widget-quick-replies')
  if (saved) {
    try {
      replies.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load quick replies:', e)
      replies.value = []
    }
  }
}

// 保存快捷回复
const saveReplies = () => {
  localStorage.setItem('widget-quick-replies', JSON.stringify(replies.value))
}

// 添加快捷回复
const addReply = () => {
  if (!newReplyText.value.trim()) {
    message.warning('请输入回复内容')
    return
  }

  replies.value.push({
    id: Date.now().toString(),
    text: newReplyText.value.trim()
  })

  saveReplies()
  newReplyText.value = ''
  isAdding.value = false
  message.success('添加成功')
}

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('Failed to copy:', error)
    message.error('复制失败')
  }
}

// 删除快捷回复
const removeReply = (id: string) => {
  replies.value = replies.value.filter(r => r.id !== id)
  saveReplies()
  message.success('删除成功')
}

// 取消添加
const cancelAdd = () => {
  isAdding.value = false
  newReplyText.value = ''
}

onMounted(() => {
  loadReplies()
})
</script>

<template>
  <div class="quick-replies-widget">
    <!-- 添加回复表单 -->
    <div v-if="isAdding" class="add-form">
      <n-input
        v-model:value="newReplyText"
        type="textarea"
        placeholder="输入快捷回复内容..."
        :rows="2"
        size="small"
        @keyup.enter.ctrl="addReply"
      />
      <div class="form-actions">
        <n-button size="tiny" @click="cancelAdd">取消</n-button>
        <n-button size="tiny" type="primary" @click="addReply">确定</n-button>
      </div>
    </div>

    <!-- 添加按钮（作为列表项） -->
    <div v-if="!isAdding" class="add-item" @click="isAdding = true">
      <n-icon :component="AddCircleOutline" :size="20" class="add-icon" />
      <span>添加快捷回复</span>
    </div>

    <!-- 回复列表 -->
    <div v-if="!isAdding" class="replies-list">
      <div v-for="reply in replies" :key="reply.id" class="reply-item">
        <div class="reply-text" @click="copyToClipboard(reply.text)">
          <n-icon :component="CopyOutline" class="copy-icon" />
          <span>{{ reply.text }}</span>
        </div>
        <button class="remove-btn" @click="removeReply(reply.id)">
          <n-icon :component="CloseCircleOutline" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-replies-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-item {
  padding: 10px 12px;
  background: rgba(139, 92, 246, 0.15);
  border: 2px dashed rgba(139, 92, 246, 0.5);
  border-radius: 6px;
  font-size: 13px;
  color: #8b5cf6;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.add-item:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: #8b5cf6;
}

.add-icon {
  flex-shrink: 0;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.reply-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reply-text {
  flex: 1;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 13px;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.4;
  word-break: break-word;
}

.reply-text:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
}

.copy-icon {
  flex-shrink: 0;
  font-size: 14px;
  opacity: 0.6;
}

.reply-text:hover .copy-icon {
  opacity: 1;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.reply-item:hover .remove-btn {
  display: flex;
}

.remove-btn:hover {
  background: #f44336;
  transform: scale(1.1);
}

.replies-list::-webkit-scrollbar {
  width: 4px;
}

.replies-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.replies-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.replies-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
