import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";

import { useCart } from "@/context/CartContext";

type Product = {
  id: number;
  name: string;
  price: string;
  stock: number;
};

export default function ProductsScreen() {
    const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://192.168.1.71:5000/api/products")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load products");
        }
        return response.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load products. Please try again.");
        setLoading(false);
      });
  }, []);

  return (
    <ScrollView
  style={styles.container}
  contentContainerStyle={{ paddingBottom: 100 }}
>
      <Text style={styles.title}>Our Products</Text>
      <Text style={styles.subtitle}>
        Explore our gaming accessories.
      </Text>

      {loading && <ActivityIndicator size="large" />}

      {error !== "" && <Text>{error}</Text>}

      {products.map((product) => (
        <View style={styles.product} key={product.id}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.price}>
            Rs. {Number(product.price).toLocaleString()}
          </Text>
          <Text style={styles.stock}>
            {product.stock > 0
              ? `In Stock: ${product.stock}`
              : "Out of Stock"}
          </Text>
          <Pressable
  style={[
    styles.addButton,
    product.stock === 0 && styles.disabledButton,
  ]}
  onPress={() => addToCart(product)}
  disabled={product.stock === 0}
>
  <Text style={styles.addButtonText}>
    {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
  </Text>
</Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    addButton: {
  backgroundColor: "#2563EB",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 14,
},

disabledButton: {
  backgroundColor: "#9CA3AF",
},

addButtonText: {
  color: "#FFFFFF",
  fontWeight: "bold",
  fontSize: 15,
},
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    padding: 25,
    paddingBottom: 45,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#142D4E",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    color: "#555555",
  },
  product: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 14,
    marginTop: 18,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#142D4E",
  },
  price: {
    fontSize: 16,
    color: "#2563EB",
    marginTop: 8,
  },
  stock: {
    fontSize: 14,
    color: "#555555",
    marginTop: 6,
  },
});