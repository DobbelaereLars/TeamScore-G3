<!-- <script setup>
import { computed } from 'vue'

const props = defineProps({
  // Variant (matches Figma property)
  variant: {
    type: String,
    default: 'Primary',
    validator: (value) => ['Primary', 'Secondary', 'OnClick', 'Icon Button', 'Icon Button Empty'].includes(value)
  },
  // Button tekst (matches Figma property)
  buttonTekst: {
    type: String,
    default: 'Button'
  },
  // Icon Left (matches Figma property)
  iconLeft: {
    type: String,
    default: 'http://localhost:3845/assets/6c900821a1b863d36724025d51168c4b4e0076e8.svg'
  },
  // Icon Right (matches Figma property)
  iconRight: {
    type: String,
    default: 'http://localhost:3845/assets/6c900821a1b863d36724025d51168c4b4e0076e8.svg'
  },
  // Show icon left (matches Figma property)
  showIconLeft: {
    type: Boolean,
    default: true
  },
  // Show icon right (matches Figma property)
  showIconRight: {
    type: Boolean,
    default: false
  },
  // Additional props
  disabled: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const variantStyles = {
  Primary: {
    backgroundColor: '#534AFF',
    color: '#FDFFFF',
    height: '2.875rem'
  },
  Secondary: {
    backgroundColor: '#FCFAFA',
    color: '#534AFF',
    height: '2.875rem'
  },
  OnClick: {
    backgroundColor: '#7A73FF',
    color: '#FDFFFF',
    height: '2.875rem'
  },
  'Icon Button': {
    backgroundColor: '#534AFF',
    color: '#FDFFFF',
    width: '2.875rem',
    height: '2.875rem',
    padding: '0.9375rem'
  },
  'Icon Button Empty': {
    backgroundColor: '#F0EFFF',
    color: '#534AFF',
    width: '2.875rem',
    height: '2.875rem',
    padding: '0.9375rem'
  }
}

const isIconButton = computed(() => 
  props.variant === 'Icon Button' || props.variant === 'Icon Button Empty'
)

const iconColor = computed(() => {
  switch(props.variant) {
    case 'Secondary':
    case 'Icon Button Empty':
      return '#534AFF'
    default:
      return '#FDFFFF'
  }
})

const buttonStyle = computed(() => {
  const baseStyle = {
    ...variantStyles[props.variant],
    fontSize: 'var(--font-size-body)',
    fontWeight: 'var(--font-semibold)',
    lineHeight: '1.375rem',
    fontFamily: 'var(--font-family-inter)',
    borderRadius: '0.3125rem',
    boxShadow: '0rem 0.25rem 1.5rem 0rem rgba(9, 44, 76, 0.08)'
  }
  
  if (!isIconButton.value) {
    baseStyle.paddingLeft = '1.5rem'
    baseStyle.paddingRight = '1.5rem'
    baseStyle.paddingTop = '0.5rem'
    baseStyle.paddingBottom = '0.5rem'
    baseStyle.gap = '0.75rem'
  }
  
  return baseStyle
})
</script>

<template>
  <button
    :class="['btn', { 'btn--full-width': fullWidth, 'btn--icon-only': isIconButton }]"
    :style="buttonStyle"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span v-if="(showIconLeft || $slots['icon-left']) && !isIconButton" class="btn__icon btn__icon--left" :style="{ '--icon-color': iconColor }">
      <slot name="icon-left">
        <img v-if="iconLeft && iconLeft.startsWith('http')" :src="iconLeft" alt="" class="btn__icon-img" />
        <span v-else-if="iconLeft" v-html="iconLeft"></span>
      </slot>
    </span>
    <span v-if="isIconButton && (iconLeft || $slots['icon-left'])" class="btn__icon btn__icon--center" :style="{ '--icon-color': iconColor }">
      <slot name="icon-left">
        <img v-if="iconLeft && iconLeft.startsWith('http')" :src="iconLeft" alt="" class="btn__icon-img" />
        <span v-else-if="iconLeft" v-html="iconLeft"></span>
      </slot>
    </span>
    <span v-if="!isIconButton" class="btn__text">
      <slot>{{ buttonTekst }}</slot>
    </span>
    <span v-if="(showIconRight || $slots['icon-right']) && !isIconButton" class="btn__icon btn__icon--right" :style="{ '--icon-color': iconColor }">
      <slot name="icon-right">
        <img v-if="iconRight && iconRight.startsWith('http')" :src="iconRight" alt="" class="btn__icon-img" />
        <span v-else-if="iconRight" v-html="iconRight"></span>
      </slot>
    </span>
  </button>
</template>

<style scoped lang="scss">
</style> -->
