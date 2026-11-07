let cart = JSON.parse(localStorage.getItem("cart")) || [];


// ==========================================
// 2. CART COUNTER
// ==========================================

const cartBadge = document.getElementById("cart-count");

function updateCartCount() {
    let count = 0;

    cart.forEach(function(product) {
        count += product.quantity;
    });

    if (cartBadge) {
        cartBadge.textContent = count;
    }
}


// ==========================================
// 3. ADD PRODUCTS TO CART
// ==========================================

const productGrid = document.getElementById("product-grid");

// Connect database product names to your existing images
const productImages = {
    "Gaming Mouse": "Product Images/Mouse.jpg",
    "Gaming Keyboard": "Product Images/Keyboard.jpg",
    "Gaming Headset": "Product Images/Headset.jpg",
    "Gaming Controller": "Product Images/Controller.jpg",
    "Mouse Pad": "Product Images/Mouse Pad.jpg",
    "Microphone": "Product Images/Microphone.jpg",
    "Speakers": "Product Images/Speakers.jpg",
    "Webcam": "Product Images/Webcam.jpg",
    "Monitor": "Product Images/Monitor.jpg",
    "Gaming Chair": "Product Images/Gaming Chair.jpg"
};

async function loadProducts() {

    if (!productGrid) return;

    try {

        const response = await fetch(
            "http://localhost:5000/api/products"
        );

        if (!response.ok) {
            throw new Error("Could not load products");
        }

        const products = await response.json();

        productGrid.innerHTML = "";

        products.forEach(function(product) {

            const card = document.createElement("div");
            card.className = "product-card";

            const image = document.createElement("img");
            image.src = productImages[product.name] || "";
            image.alt = product.name;

            const name = document.createElement("h3");
            name.textContent = product.name;

            const price = document.createElement("p");
            price.className = "price";
            price.textContent =
                "Rs. " + Number(product.price).toLocaleString();

            const stock = document.createElement("p");
            stock.className = "stock";

            const button = document.createElement("button");
            button.className = "add-btn";
            button.dataset.name = product.name;
            button.dataset.price = product.price;
            button.dataset.stock = product.stock;

            if (product.stock > 0) {

                stock.textContent =
                    "In Stock: " + product.stock + " units";

                button.textContent = "Add to Cart";

            } else {

                stock.textContent = "Out of Stock";
                stock.classList.add("out-of-stock");

                button.textContent = "Out of Stock";
                button.disabled = true;
            }

            card.append(image, name, price, stock, button);
            productGrid.appendChild(card);

        });

    } catch (error) {

        console.log("Product loading error:", error);
        productGrid.textContent =
            "Unable to load products. Please try again.";

    }
}

loadProducts();


// ==========================================
// 4. ADD PRODUCTS TO CART
// ==========================================

if (productGrid) {

    productGrid.addEventListener("click", function(event) {

        const button = event.target.closest(".add-btn");

        if (!button || button.disabled) return;

        const name = button.dataset.name;
        const price = Number(button.dataset.price);
        const stock = Number(button.dataset.stock);

        let existingProduct = cart.find(function(product) {
            return product.name === name;
        });

        if (existingProduct) {

            existingProduct.stock = stock;

            if (existingProduct.quantity >= stock) {
                alert("You cannot add more than available stock.");
                return;
            }

            existingProduct.quantity++;

        } else {

            cart.push({
                name: name,
                price: price,
                quantity: 1,
                stock: stock
            });

        }

        localStorage.setItem("cart", JSON.stringify(cart));

        updateCartCount();
    });

}


// ==========================================
// 4. DISPLAY CART PRODUCTS
// ==========================================

const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

function displayCart() {

    if (!cartItems || !cartTotal) {
        return;
    }

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
        cartTotal.textContent = "Total: Rs. 0";
        return;
    }

    let total = 0;
    let output = "";

    cart.forEach(function(product, index) {

        const subtotal = product.price * product.quantity;

        total += subtotal;

        output += `
            <div class="cart-item">

                <h3>${product.name}</h3>

                <p>Price: Rs. ${product.price.toLocaleString()}</p>

                <p>Quantity: ${product.quantity}</p>

                <p>Subtotal: Rs. ${subtotal.toLocaleString()}</p>

                <button data-action="decrease" data-index="${index}">−</button>

                <button data-action="increase" data-index="${index}">+</button>

                <button data-action="remove" data-index="${index}">Remove</button>

            </div>
        `;
    });

    cartItems.innerHTML = output;

    cartTotal.textContent = "Total: Rs. " + total.toLocaleString();
}


// ==========================================
// 5. INCREASE, DECREASE AND REMOVE PRODUCTS
// ==========================================

if (cartItems) {

    cartItems.addEventListener("click", function(event) {

        const button = event.target.closest("button");

        if (!button) {
            return;
        }

        const index = Number(button.dataset.index);
        const action = button.dataset.action;

        if (!Number.isInteger(index) || !cart[index]) {
            return;
        }

        if (action === "increase") {
            cart[index].quantity++;
        }

        if (action === "decrease") {
            cart[index].quantity--;

            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }
        }

        if (action === "remove") {
            cart.splice(index, 1);
        }

        localStorage.setItem("cart", JSON.stringify(cart));

        updateCartCount();
        displayCart();
    });
}


// ==========================================
// 6. CHECKOUT BUTTON
// ==========================================

const checkoutButton = document.getElementById("checkout-btn");

if (checkoutButton) {

    checkoutButton.addEventListener("click", function() {

        if (cart.length === 0) {
            alert("Your cart is empty!");
        } else {
            window.location.href = "checkout.html";
        }

    });
}


// ==========================================
// 7. CHECKOUT ORDER SUMMARY
// ==========================================

const checkoutForm = document.getElementById("checkout-form");
const checkoutSummary = document.getElementById("checkout-summary");

if (checkoutSummary) {

    let summary = "";
    let total = 0;

    cart.forEach(function(product) {

        const subtotal = product.price * product.quantity;

        total += subtotal;

        summary += product.name + " x " +
            product.quantity + " = Rs. " +
            subtotal.toLocaleString() + "\n";

    });

    checkoutSummary.style.whiteSpace = "pre-line";

    checkoutSummary.textContent =
        cart.length === 0
            ? "Your cart is empty."
            : summary + "\nGrand Total: Rs. " + total.toLocaleString();
}


// ==========================================
// 8. PLACE PRACTICE ORDER
// ==========================================

if (checkoutForm) {

    checkoutForm.addEventListener("submit", function(event) {

        event.preventDefault();

        if (cart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        const formData = new FormData(checkoutForm);

        const customer = {
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            country: formData.get("country"),
            address: formData.get("address"),
            payment: formData.get("payment")
        };

        const total = cart.reduce(function(sum, product) {
            return sum + product.price * product.quantity;
        }, 0);

        const order = {
            customer: customer,
            products: cart,
            total: total,
            orderDate: new Date().toISOString()
        };

        localStorage.setItem("lastOrder", JSON.stringify(order));

        alert("Practice order placed successfully!");

        cart = [];

        localStorage.setItem("cart", JSON.stringify(cart));

        window.location.href = "index.html";

    });
}


// ==========================================
// 9. INITIAL PAGE UPDATE
// ==========================================

updateCartCount();
displayCart();