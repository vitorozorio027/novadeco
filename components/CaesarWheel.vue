<template>
  <div class="caesar-wheel-container">
    <div class="wheel-wrapper">
      <div class="wheel outer-wheel" ref="outerWheel" :style="{ transform: `rotate(${outerRotation}deg)` }">
        <div class="wheel-border"></div>
        <div v-for="(letter, index) in alphabet" :key="index" class="wheel-letter" :class="{ 'highlight-letter': letter === 'A' }" :style="getLetterPosition(index, 26, 140)">
          <div class="letter-content">{{ letter }}</div>
        </div>
        <div v-for="(_, index) in alphabet" :key="'divider-outer-' + index"
             class="wheel-divider"
             :style="getDividerPosition(index, 26, 140)">
        </div>
      </div>
      <div class="wheel inner-wheel" ref="innerWheel" :style="{ transform: `rotate(${innerRotation}deg)` }">
        <div class="wheel-border"></div>
        <div v-for="(letter, index) in alphabet" :key="index" class="wheel-letter" :class="{ 'highlight-letter': letter === 'A' }" :style="getLetterPosition(index, 26, 100)">
          <div class="letter-content">{{ letter }}</div>
        </div>
        <div v-for="(_, index) in alphabet" :key="'divider-inner-' + index"
             class="wheel-divider"
             :style="getDividerPosition(index, 26, 100)">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const outerShift = ref(0)
const innerShift = ref(0)
const outerRotation = ref(0)
const innerRotation = ref(0)
const outerWheel = ref(null)
const innerWheel = ref(null)
let isDragging = false
let startAngle = 0
let currentAngle = 0
let activeWheel = null

const getLetterPosition = (index, total, radius) => {
  const angle = (index * 360) / total
  const x = radius * Math.cos((angle - 90) * (Math.PI / 180))
  const y = radius * Math.sin((angle - 90) * (Math.PI / 180))
  const rotation = angle
  return {
    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`
  }
}

const getDividerPosition = (index, total, radius) => {
  const angle = (index * 360) / total
  const rotation = angle
  return {
    transform: `rotate(${rotation}deg)`
  }
}

const updateOuterShift = (newShift) => {
  outerShift.value = newShift
  outerRotation.value = newShift * (360 / 26)
}

const updateInnerShift = (newShift) => {
  innerShift.value = newShift
  innerRotation.value = newShift * (360 / 26)
}

const handleMouseDown = (e, wheel) => {
  isDragging = true
  activeWheel = wheel
  const rect = wheel.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
  currentAngle = wheel === outerWheel.value ? outerRotation.value : innerRotation.value
}

const handleMouseMove = (e) => {
  if (!isDragging || !activeWheel) return
  const rect = activeWheel.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
  const deltaAngle = angle - startAngle
  
  if (activeWheel === outerWheel.value) {
    outerRotation.value = currentAngle + deltaAngle
    const newShift = Math.round((outerRotation.value * 26) / 360) % 26
    outerShift.value = newShift < 0 ? newShift + 26 : newShift
  } else {
    innerRotation.value = currentAngle + deltaAngle
    const newShift = Math.round((innerRotation.value * 26) / 360) % 26
    innerShift.value = newShift < 0 ? newShift + 26 : newShift
  }
}

const handleMouseUp = () => {
  isDragging = false
  activeWheel = null
}

onMounted(() => {
  if (outerWheel.value && innerWheel.value) {
    outerWheel.value.addEventListener('mousedown', (e) => handleMouseDown(e, outerWheel.value))
    innerWheel.value.addEventListener('mousedown', (e) => handleMouseDown(e, innerWheel.value))
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }
})

onUnmounted(() => {
  if (outerWheel.value && innerWheel.value) {
    outerWheel.value.removeEventListener('mousedown', (e) => handleMouseDown(e, outerWheel.value))
    innerWheel.value.removeEventListener('mousedown', (e) => handleMouseDown(e, innerWheel.value))
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }
})
</script>

<style scoped>
.caesar-wheel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 1rem 2rem;
  margin-top: -2rem;
}

.wheel-wrapper {
  position: relative;
  width: 400px;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.wheel {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.1s ease;
}

.outer-wheel {
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  cursor: grab;
}

.inner-wheel {
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  cursor: grab;
}

.outer-wheel:active,
.inner-wheel:active {
  cursor: grabbing;
}

.wheel-border {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid #333;
}

.wheel-letter {
  position: absolute;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  transform-origin: center;
  transition: all 0.3s ease;
  z-index: 2;
}

.letter-content {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  transform: rotate(0deg); /* Mantém o texto sempre legível */
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.highlight-letter .letter-content {
  color: #ff4081;
  font-size: 1.4rem;
}

.wheel-divider {
  position: absolute;
  width: 2px;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  transform-origin: center;
  z-index: 1;
}

.controls {
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style> 