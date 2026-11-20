import { View, Text, StyleSheet } from "react-native";
import { useCart } from "@/context/CartContext";

export default function CartScreen() {
const { cart, decreaseQuantity, removeFromCart } = useCart();
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Cart 🛒</Text>

      {cart.length === 0 ? (
        <Text style={styles.empty}>Your shopping cart is empty.</Text>
      ) : (
        cart.map((item) => (
          <View style={styles.item} key={item.id}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>Quantity: {item.quantity}</Text>
            <Text style={styles.price}>
              Rs. {(Number(item.price) * item.quantity).toLocaleString()}
            </Text>
          </View>
        ))
      )}

      {cart.length > 0 && (
        <Text style={styles.total}>
          Total: Rs. {total.toLocaleString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    padding: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#142D4E",
    marginTop: 20,
  },
  empty: {
    fontSize: 16,
    color: "#666666",
    marginTop: 20,
  },
  item: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 12,
    marginTop: 15,
  },
  name: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#142D4E",
  },
  price: {
    color: "#2563EB",
    marginTop: 6,
  },
  total: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#142D4E",
    marginTop: 25,
    },
});