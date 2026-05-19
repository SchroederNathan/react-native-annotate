import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AnnotationProvider } from 'react-native-annotate';

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Acme Mobile</Text>
      <Text style={styles.headerSubtitle}>Annotation demo</Text>
    </View>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

function PrimaryButton({ label }: { label: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function Avatar() {
  return (
    <Image
      source={{ uri: 'https://i.pravatar.cc/100?img=12' }}
      style={styles.avatar}
    />
  );
}

function ProfileRow() {
  return (
    <View style={styles.profileRow}>
      <Avatar />
      <View style={styles.profileText}>
        <Text style={styles.profileName}>Iris Park</Text>
        <Text style={styles.profileMeta}>Pro member · since 2024</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <AnnotationProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Header />
          <ProfileRow />
          <FeatureCard
            title="Smart inbox"
            body="Conversations are grouped automatically so you can focus on what matters."
          />
          <FeatureCard
            title="Offline drafts"
            body="Write anywhere — drafts sync the moment you reconnect."
          />
          <PrimaryButton label="Upgrade to Team" />
          <Text style={styles.hint}>
            Tap the ✎ button in the corner, then tap any element above to
            annotate it. Open ≡ to see notes and copy markdown.
          </Text>
        </ScrollView>
      </View>
    </AnnotationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 120,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardBody: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  hint: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 19,
  },
});
