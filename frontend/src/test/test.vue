<script setup>
import { ref } from 'vue';
import InputField from '../components/InputField.vue';
import Button from '../components/Button.vue';
import InputRadioCards from '../components/InputRadioCards.vue';
import InputNumber from '../components/InputNumber.vue';
import ToggleWithDropdown from '../components/ToggleWithDropdown.vue';

import Playercard from '../components/ScoreboardPlayercard.vue';
import ProgressBar from '../components/ProgressBar.vue';
import PlayerIcon from '../components/ProfileIcon.vue';

import TabList from '../components/TabList.vue';
import TabBar from '../components/TabBar.vue';

import { Gamepad2, Calendar, Plus, Settings } from 'lucide-vue-next';
import PlayersSetting from '../components/PlayersSetting.vue';
import HostPlayerItem from '../components/HostPlayerItem.vue';

const radioItems = [
  {
    id: 'game',
    value: 'game',
    label: 'Speltype',
    description: 'Beschrijving van Speltype',
    icon: Gamepad2,
    checked: true,
  },
  {
    id: 'date',
    value: 'date',
    label: 'Datum',
    description: 'Beschrijving van Datum',
    icon: Calendar,
  },
  {
    id: 'settings',
    value: 'settings',
    label: 'Opties',
    description: 'Beschrijving van Opties',
    icon: Settings,
  },
];

const tabListItems = ref([
  {
    id: 'tabList1',
    value: 'tabList1',
    label: 'Tab 1',
    icon: Gamepad2,
    checked: true,
  },
  {
    id: 'tabList2',
    value: 'tabList2',
    label: 'Tab 2',
    icon: Calendar,
  },
  {
    id: 'tabList3',
    value: 'tabList3',
    label: 'Tab 3',
    icon: Settings,
  },
]);

const tabListItemsClose = ref([
  {
    id: 'tabListClose1',
    value: 'tabListClose1',
    label: 'Tab 1',
    icon: Gamepad2,
    checked: true,
  },
  {
    id: 'tabListClose2',
    value: 'tabListClose2',
    label: 'Tab 2',
    icon: Calendar,
  },
  {
    id: 'tabListClose3',
    value: 'tabListClose3',
    label: 'Tab 3',
    icon: Settings,
  },
]);

const handleTabListClose = (itemId) => {
  // Find the item being closed met actuele checked-state
  const closedItem = tabListItemsClose.value.find((item) => item.id === itemId);
  const wasChecked = closedItem?.checked ?? false;

  // Verwijder het item uit de array
  tabListItemsClose.value = tabListItemsClose.value.filter(
    (item) => item.id !== itemId
  );

  // Alleen een andere tab selecteren als de gesloten tab geselecteerd was
  if (wasChecked && tabListItemsClose.value.length > 0) {
    // Kies de eerste overblijvende tab als nieuwe geselecteerde
    const newSelectedId = tabListItemsClose.value[0].id;
    tabListItemsClose.value = tabListItemsClose.value.map((item) => ({
      ...item,
      checked: item.id === newSelectedId,
    }));
  }
};

const handleTabListChange = (itemId) => {
  // Update de checked-state zodat die altijd overeenkomt met de DOM
  tabListItemsClose.value = tabListItemsClose.value.map((item) => ({
    ...item,
    checked: item.id === itemId,
  }));
};

const tabBarItems = [
  {
    id: 'tabBar1',
    value: 'tabBar1',
    label: 'Tab 1',
    icon: Gamepad2,
    checked: true,
  },
  {
    id: 'tabBar2',
    value: 'tabBar2',
    label: 'Tab 2',
    icon: Calendar,
  },
  {
    id: 'tabBar3',
    value: 'tabBar3',
    label: 'Tab 3',
    icon: Settings,
  },
];
</script>

<template>
  <div class="container d-flex gap-4 flex-column mt-5 mb-5">
    <Button button-tekst="Test Button met Icons">
      <template #c-btn_icon-left>
        <Gamepad2 :size="18" />
      </template>
      <template #c-btn_icon-right>
        <Plus :size="18" />
      </template>
    </Button>

    <Button button-tekst="Primary (normal)" variant="primary" />
    <Button button-tekst="Secondary (normal)" variant="secondary" />

    <Button :is-icon-button="true" variant="primary">
      <template #c-btn_icon-left>
        <Calendar :size="18" />
      </template>
    </Button>

    <Button :is-icon-button="true" variant="secondary">
      <template #c-btn_icon-left>
        <Calendar :size="18" />
      </template>
    </Button>

    <InputField id="session-name" name="sessionName" label="Sessienaam" placeholder="Bv. Sportdag 05/01/2026" />
    <br />
    <InputField id="no-label" name="noLabel" :label="false" placeholder="Geen label" />
    <br />
    <InputField id="default-input" name="defaultInput" placeholder="Default label placeholder" />

    <InputRadioCards :items="radioItems" name="test-radio" />

    <InputNumber min="2" max="10" label="Number" id="numberInput" name="numberInput" type="number" />

    <ToggleWithDropdown></ToggleWithDropdown>

    <PlayersSetting player-mode="players" />

    <br />

    <Playercard variant="P3" spelersnaam="Lars Dehe" :score="5" :maxValue="100" :position="2" />

    <TabList :items="tabListItems" name="test-tablist" :hideIcon="false"></TabList>

    <TabList :items="tabListItemsClose" name="test-tablist-close" :hideIcon="false" :closeable="true"
      @close="handleTabListClose" @change="handleTabListChange"></TabList>

    <TabBar :items="tabBarItems" name="test-tabbar" :hideIcon="true"></TabBar>

    <HostPlayerItem name="Renz Deheegher" />
  </div>
</template>

<style scoped></style>
