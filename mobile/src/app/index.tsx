import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import logo from "../../assets/logo.png";
export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
  <Image source={logo} style={{ width: 45, height: 45, resizeMode: "contain" }} />
  <Text style={styles.logo}>Digital Store</Text>
</View>
        <Text style={styles.cart}>🛒 Cart</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>LEVEL UP YOUR GAMING</Text>
        <Text style={styles.subtitle}>
          Discover gaming accessories for your setup.
        </Text>
      </View>

      <Text style={styles.heading}>Featured Products</Text>

      <View style={styles.product}>
        <Text style={styles.productEmoji}>🖱️</Text>
        <Text style={styles.productName}>Gaming Mouse</Text>
        <Text style={styles.price}>Rs. 2,500</Text>
      </View>

      <View style={styles.product}>
        <Text style={styles.productEmoji}>⌨️</Text>
        <Text style={styles.productName}>Gaming Keyboard</Text>
        <Text style={styles.price}>Rs. 4,500</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 35,
    marginBottom: 30,
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#142D4E",
  },
  cart: {
    fontSize: 16,
    color: "#2563EB",
  },
  hero: {
    backgroundColor: "#142D4E",
    padding: 25,
    borderRadius: 16,
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  subtitle: {
    color: "#DCE6F5",
    marginTop: 10,
    fontSize: 14,
  },
  heading: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#142D4E",
    marginBottom: 15,
  },
  product: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 14,
    marginBottom: 15,
  },
  productEmoji: {
    fontSize: 35,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  price: {
    color: "#2563EB",
    fontSize: 16,
    marginTop: 5,
  },
});