import { View, Text, StyleSheet } from "react-native";

export default function ContactScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Us</Text>
      <Text style={styles.subtitle}>
        Need help? Get in touch with Digital Store.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    padding: 25,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#142D4E",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    color: "#555555",
  },
});