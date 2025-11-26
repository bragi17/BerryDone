<template>
  <div 
    class="member-avatar"
    :style="{ 
      backgroundColor: avatarColor,
      width: size + 'px',
      height: size + 'px',
      fontSize: fontSize + 'px'
    }"
    :title="member"
  >
    {{ initial }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  member: string
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 32
})

const initial = computed(() => {
  return props.member.charAt(0).toUpperCase()
})

const avatarColor = computed(() => {
  const colors = [
    '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', 
    '#EF4444', '#EC4899', '#6366F1', '#14B8A6'
  ]
  const index = props.member.charCodeAt(0) % colors.length
  return colors[index]
})

const fontSize = computed(() => {
  return Math.floor(props.size * 0.4)
})
</script>

<style scoped>
.member-avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
  user-select: none;
}
</style>

