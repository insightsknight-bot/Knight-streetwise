// Shared cart + account state, registered as Alpine stores so every
// page (home, new drops, lookbook) shares the same cart and login
// state without duplicating logic.

document.addEventListener('alpine:init', () => {

    Alpine.store('cart', {
        items: JSON.parse(localStorage.getItem('knight_cart') || '[]'),
        drawerOpen: false,
        checkoutStep: 'cart', // 'cart' | 'shipping' | 'success'
        shipping: { name: '', email: '', address: '', city: '', zip: '', country: '' },

        get count() {
            return this.items.reduce((sum, i) => sum + i.qty, 0);
        },
        get subtotal() {
            return this.items.reduce((sum, i) => sum + (Number(i.price) || 0) * i.qty, 0);
        },
        save() {
            localStorage.setItem('knight_cart', JSON.stringify(this.items));
        },
        add(product) {
            const existing = this.items.find(i => i.id === product.id);
            if (existing) {
                existing.qty++;
            } else {
                this.items.push({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price) || 0,
                    image: product.image,
                    qty: 1
                });
            }
            this.save();
            this.drawerOpen = true;
            this.checkoutStep = 'cart';
        },
        updateQty(id, qty) {
            const item = this.items.find(i => i.id === id);
            if (!item) return;
            if (qty <= 0) { this.remove(id); return; }
            item.qty = qty;
            this.save();
        },
        remove(id) {
            this.items = this.items.filter(i => i.id !== id);
            this.save();
        },
        clear() {
            this.items = [];
            this.save();
        },
        open() { this.drawerOpen = true; },
        close() { this.drawerOpen = false; },
        goToShipping() {
            if (this.items.length === 0) return;
            this.checkoutStep = 'shipping';
        },
        backToCart() { this.checkoutStep = 'cart'; },
        async placeOrder() {
            if (!this.shipping.name || !this.shipping.email || !this.shipping.address) {
                alert('Please fill in your name, email, and address.');
                return;
            }
            const { db, collection, addDoc, serverTimestamp, auth } = window.knightApp;
            const uid = auth.currentUser ? auth.currentUser.uid : null;
            try {
                await addDoc(collection(db, 'orders'), {
                    uid,
                    items: this.items,
                    subtotal: this.subtotal,
                    shipping: this.shipping,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
                this.checkoutStep = 'success';
                this.clear();
            } catch (err) {
                alert('Could not place order: ' + err.message);
            }
        }
    });

    Alpine.store('account', {
        user: null,
        modalOpen: false,
        mode: 'signin', // 'signin' | 'signup'
        email: '',
        password: '',
        error: '',
        orders: [],

        init() {
            const { auth, onAuthStateChanged } = window.knightApp;
            onAuthStateChanged(auth, (u) => {
                this.user = u;
                this.orders = [];
                if (u) this.loadOrders();
            });
        },
        open(mode) {
            this.modalOpen = true;
            this.mode = mode || 'signin';
            this.error = '';
        },
        async signIn() {
            const { auth, signInWithEmailAndPassword } = window.knightApp;
            this.error = '';
            try {
                await signInWithEmailAndPassword(auth, this.email, this.password);
                this.modalOpen = false;
                this.email = ''; this.password = '';
            } catch (err) { this.error = err.message; }
        },
        async signUp() {
            const { auth, createUserWithEmailAndPassword } = window.knightApp;
            this.error = '';
            try {
                await createUserWithEmailAndPassword(auth, this.email, this.password);
                this.modalOpen = false;
                this.email = ''; this.password = '';
            } catch (err) { this.error = err.message; }
        },
        async logOut() {
            const { auth, signOut } = window.knightApp;
            await signOut(auth);
        },
        async loadOrders() {
            const { db, collection, query, where, getDocs } = window.knightApp;
            try {
                const q = query(collection(db, 'orders'), where('uid', '==', this.user.uid));
                const snap = await getDocs(q);
                this.orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (err) { console.error('Could not load orders:', err); }
        }
    });

    Alpine.store('account').init();
});
