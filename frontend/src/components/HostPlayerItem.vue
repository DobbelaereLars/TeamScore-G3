<script setup>
import { Minus, Plus } from 'lucide-vue-next';
import Button from './Button.vue';
import ProfileIcon from './ProfileIcon.vue';

const props = defineProps({
    name: {
        type: String,
        default: 'Speler',
    },
    points: {
        type: Number,
        default: 0,
    },
    rank: {
        type: Number,
        default: 99,
    },
});
</script>

<template>
    <div class="c-host-player-item">
        <span class="c-host-player-item__rank">#{{ rank }}</span>
        <div class="c-host-player-item__playercontainer">
            <ProfileIcon variant="default" :size-up="true" :player-name="name" />

            <div class="c-host-player-item__playerinfo">
                <p class="h5">{{ name }}</p>
                <div class="c-host-player-item__points">
                    <span class="h4 c-host-player-item__points--value">{{ points }}</span>
                    <p class="c-host-player-item__points--label">punten</p>
                </div>
            </div>
        </div>

        <div class="c-host-player-item__buttons">
            <Button :is-icon-button="true" variant="primary">
                <template #c-btn_icon-left>
                    <Plus :size="18" />
                </template>
            </Button>
            <Button :is-icon-button="true" variant="secondary">
                <template #c-btn_icon-left>
                    <Minus :size="18" />
                </template>
            </Button>
        </div>
    </div>
</template>

<style scoped></style>