import { useState } from 'react';
import { router } from 'expo-router';
import { Body, Button, H1, Screen } from '../components/ui';
import { IntentionsPicker } from '../components/IntentionsPicker';
import { setIntentions, useAppState } from '../state/store';

export default function Intentions() {
  const state = useAppState();
  const [value, setValue] = useState(state.intentions);
  return (
    <Screen>
      <H1>What are you praying for?</H1>
      <Body muted>Choose three. They appear on each Prayer Pause, and they stay on this phone.</Body>
      <IntentionsPicker value={value} onChange={setValue} />
      <Button
        title="Save"
        disabled={!value.length}
        onPress={() => {
          setIntentions(value);
          router.back();
        }}
      />
    </Screen>
  );
}
