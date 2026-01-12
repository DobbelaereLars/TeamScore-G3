<script setup>
// import Button from '../components/Button.vue'
import Button from '../components/Button_manual.vue'
import { Gamepad2, Calendar, Plus, Settings, Trash2, Minus, MinusCircle } from 'lucide-vue-next'
import { h } from 'vue'

// Helper function om Lucide icon om te zetten naar string voor de Button
const iconToString = (icon) => {
  const vnode = h(icon, { size: 18 })
  const div = document.createElement('div')
  div.innerHTML = vnode.type.render(vnode.props).outerHTML || ''
  return div.innerHTML
}
</script>

<template>
 
    
    <div class="button-container">
    <Button 
      button-tekst="Test Button met Icons"
    >
      <template #c-icon-left>
        <Gamepad2 :size="18" />
      </template>
      <template #c-icon-right>
        <Plus :size="18" />
      </template>
    </Button>

    <Button 
      button-tekst=""
      :is-icon-button="true"
    >
      <template #c-icon-left>
        <Calendar :size="18" /> 
      </template>
    </Button>
        

    </div>
</template>

<style scoped>
.tablet-home {
  padding: 2rem;
}

.button-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin-top: 2rem;
  align-items: flex-start;
}
</style>