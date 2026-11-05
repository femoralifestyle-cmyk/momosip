
function PublicMenu({ onLogin, setNotice }) {
  const { products, categories, banners, busy } = useCatalog();

  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState("takeaway");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Customer order tracking
  const [lastOrder, setLastOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingPhone, setTrackingPhone] = useState("");
  const [orderStatus, setOrderStatus] = useState(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const visible = products.filter(
    p => p.is_available &&
      (category === "All" || p.category_id === category)
  );

  const items = products
    .filter(p => cart[p.id])
    .map(p => ({ ...p, qty: cart[p.id] }));

  const total = items.reduce(
    (s, p) => s + Number(p.price) * p.qty, 0
  );

  const add = id =>
    setCart(v => ({ ...v, [id]: (v[id] || 0) + 1 }));

  const change = (id, n) =>
    setCart(v => {
      const x = { ...v };
      if (n <= 0) delete x[id];
      else x[id] = n;
      return x;
    });

  // Fetch order status from Supabase
  const fetchOrderStatus = async (orderNumber, customerPhone) => {
    if (!orderNumber || !customerPhone) return;

    const { data, error } = await supabase.rpc(
      "customer_track_order",
      {
        p_order_number: orderNumber,
        p_phone: customerPhone
      }
    );

    if (error) {
      setTrackingError(error.message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      setTrackingError("Order not found. Please check your order number and phone number.");
      setOrderStatus(null);
      return;
    }

    setTrackingError("");
    setOrderStatus(result);
  };

  // Automatically refresh the latest order every 10 seconds
  useEffect(() => {
    if (!lastOrder) return;

    const refreshStatus = () => {
      fetchOrderStatus(lastOrder.orderNumber, lastOrder.phone);
    };

    refreshStatus();

    const timer = setInterval(refreshStatus, 10000);

    return () => clearInterval(timer);
  }, [lastOrder]);

  // Manually track an order
  const trackOrder = async e => {
    e.preventDefault();

    if (!trackingNumber.trim() || !trackingPhone.trim()) {
      setTrackingError("Enter your order number and phone number.");
      return;
    }

    setTrackingBusy(true);
    setTrackingError("");
    setOrderStatus(null);

    await fetchOrderStatus(
      trackingNumber.trim(),
      trackingPhone.trim()
    );

    setTrackingBusy(false);
  };

  // Place customer order
  const place = async e => {
    e.preventDefault();

    if (!items.length) return;

    setSubmitting(true);

    const payload = {
      customer_name: customer,
      customer_phone: phone,
      order_type: orderType,
      notes,
      items: items.map(i => ({
        product_id: i.id,
        quantity: i.qty
      }))
    };

    const { data, error } = await supabase.rpc(
      "place_order",
      { order_data: payload }
    );

    if (error) {
      setNotice("Order could not be placed: " + error.message);
    } else {
      const orderNumber = data?.order_number;

      if (orderNumber) {
        setLastOrder({
          orderNumber: String(orderNumber),
          phone: phone
        });

        setTrackingNumber(String(orderNumber));
        setTrackingPhone(phone);
        setOrderStatus(null);
        setTrackingError("");
      }

      setCart({});
      setCustomer("");
      setPhone("");
      setNotes("");

      setNotice(
        `Order ${orderNumber || ""} placed successfully. Thank you!`
      );
    }

    setSubmitting(false);
  };

  const statusSteps = [
    "pending",
    "preparing",
    "ready",
    "completed"
  ];

  const statusLabels = {
    pending: "Order received",
    preparing: "Preparing your order",
    ready: "Ready for pickup",
    completed: "Order completed",
    cancelled: "Order cancelled"
  };

  const currentStatus = orderStatus?.status?.toLowerCase();

  return (
    <main>
      <section className="hero">
        {banners[0]?.image_url && (
          <img
            className="hero-image"
            src={banners[0].image_url}
            alt="MomoSip café banner"
          />
        )}

        <div className="hero-content">
          <p className="eyebrow light">
            A LITTLE TASTE OF THE COAST
          </p>

          <h1>
            {banners[0]?.title || "Good food. Great beach days."}
          </h1>

          <p>
            {banners[0]?.subtitle ||
              "Freshly prepared favourites, served by the shore at Unniyal Beach."}
          </p>

          <a className="btn btn-cream" href="#menu">
            Explore menu <span>↓</span>
          </a>
        </div>

        <div className="hero-tag">MOMENTS BY THE SEA</div>
      </section>

      <section className="section" id="menu">
        <div className="section-head">
          <div>
            <p className="eyebrow">MADE FRESH FOR YOU</p>
            <h2>Our menu</h2>
            <p className="muted">
              Choose your favourites and place an order.
            </p>
          </div>

          <span className="menu-count">
            {visible.length} items
          </span>
        </div>

        <div className="chips">
          <button
            className={category === "All" ? "chip active" : "chip"}
            onClick={() => setCategory("All")}
          >
            All
          </button>

          {categories.map(c => (
            <button
              key={c.id}
              className={category === c.id ? "chip active" : "chip"}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {busy ? (
          <div className="empty">Loading menu…</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            No products available right now. Please check back soon.
          </div>
        ) : (
          <div className="product-grid">
            {visible.map(p => (
              <article className="product-card" key={p.id}>
                <div className="product-photo">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <div className="photo-placeholder">
                      <Utensils size={32} />
                    </div>
                  )}

                  <span className={`food-tag ${p.is_vegetarian ? "veg" : "nonveg"}`}>
                    {p.is_vegetarian ? "VEG" : "NON-VEG"}
                  </span>
                </div>

                <div className="product-info">
                  <div>
                    <h3>{p.name}</h3>
                    <p>{p.description || "Freshly prepared at MomoSip."}</p>
                  </div>

                  <div className="product-bottom">
                    <b>{money(p.price)}</b>

                    <button
                      className="add-btn"
                      onClick={() => add(p.id)}
                    >
                      <Plus size={15} /> Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CUSTOMER CART AND CHECKOUT */}
      <section className="order-section" id="customer-cart">
        <form className="order-card" onSubmit={place}>
          <div className="order-title">
            <div>
              <p className="eyebrow">YOUR SELECTION</p>
              <h2>Your cart</h2>
            </div>

            <ShoppingBag size={23} />
          </div>

          {items.length === 0 ? (
            <p className="muted">
              Your cart is empty. Add something delicious from the menu.
            </p>
          ) : (
            items.map(i => (
              <div className="cart-row" key={i.id}>
                <div>
                  <b>{i.name}</b>
                  <small>{money(i.price)} each</small>
                </div>

                <div className="qty">
                  <button
                    type="button"
                    onClick={() => change(i.id, i.qty - 1)}
                  >
                    <Minus size={14} />
                  </button>

                  <b>{i.qty}</b>

                  <button
                    type="button"
                    onClick={() => change(i.id, i.qty + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <strong>{money(i.price * i.qty)}</strong>
              </div>
            ))
          )}

          <div className="total-row">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>

          <label>
            Your name
            <input
              required
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="Customer name"
            />
          </label>

          <label>
            Phone number
            <input
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Mobile number"
            />
          </label>

          <label>
            Order type
            <select
              value={orderType}
              onChange={e => setOrderType(e.target.value)}
            >
              <option value="takeaway">Takeaway</option>
              <option value="dine_in">Dine-in</option>
            </select>
          </label>

          <label>
            Special instructions
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any preferences? (optional)"
            />
          </label>

          <button
            className="btn btn-dark full"
            disabled={!items.length || submitting}
          >
            {submitting
              ? "Placing order…"
              : `Place order · ${money(total)}`}
          </button>

          <p className="tiny muted">
            Your order will be sent to the MomoSip team for confirmation.
          </p>

          {/* ORDER STATUS AFTER CHECKOUT */}
          {lastOrder && (
            <div className="customer-status-card">
              <div className="status-card-heading">
                <div>
                  <p className="eyebrow">LIVE ORDER TRACKING</p>
                  <h3>Your order status</h3>
                  <p className="muted">
                    Order #{lastOrder.orderNumber}
                  </p>
                </div>

                <RefreshCw size={20} />
              </div>

              {trackingError ? (
                <p className="tracking-error">{trackingError}</p>
              ) : !orderStatus ? (
                <p className="muted">
                  Checking your order status…
                </p>
              ) : (
                <>
                  <div className={`current-order-status ${currentStatus}`}>
                    {currentStatus === "completed" ? (
                      <CheckCircle2 size={21} />
                    ) : currentStatus === "cancelled" ? (
                      <X size={21} />
                    ) : (
                      <Clock3 size={21} />
                    )}

                    <div>
                      <small>Current status</small>
                      <b>
                        {statusLabels[currentStatus] || currentStatus}
                      </b>
                    </div>
                  </div>

                  {currentStatus === "cancelled" ? (
                    <p className="muted">
                      This order has been cancelled. Please contact the café if you need assistance.
                    </p>
                  ) : (
                    <div className="order-progress">
                      {statusSteps.map((step, index) => {
                        const currentIndex = statusSteps.indexOf(currentStatus);
                        const done = currentIndex >= index;

                        return (
                          <div
                            className={`progress-step ${done ? "done" : ""}`}
                            key={step}
                          >
                            <div className="progress-dot">
                              {done ? <CheckCircle2 size={17} /> : index + 1}
                            </div>

                            <span>
                              {step.charAt(0).toUpperCase() + step.slice(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <p className="tiny muted">
                Order status refreshes automatically every 10 seconds.
              </p>
            </div>
          )}
        </form>
      </section>

      {/* TRACK AN EXISTING ORDER */}
      <section className="order-section">
        <div className="order-card tracking-card">
          <div className="order-title">
            <div>
              <p className="eyebrow">ORDER UPDATES</p>
              <h2>Track your order</h2>
              <p className="muted">
                Enter your order number and phone number to check your order.
              </p>
            </div>

            <Clock3 size={23} />
          </div>

          <form onSubmit={trackOrder}>
            <label>
              Order number
              <input
                required
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="Enter order number"
              />
            </label>

            <label>
              Phone number
              <input
                required
                value={trackingPhone}
                onChange={e => setTrackingPhone(e.target.value)}
                placeholder="Enter registered phone number"
              />
            </label>

            <button
              className="btn btn-dark full"
              disabled={trackingBusy}
            >
              {trackingBusy ? "Checking…" : "Check order status"}
            </button>
          </form>

          {trackingError && !lastOrder && (
            <p className="tracking-error">{trackingError}</p>
          )}

          {orderStatus && (
            <div className="tracked-result">
              <b>Order #{orderStatus.order_number}</b>
              <span className={`status-badge ${orderStatus.status}`}>
                {statusLabels[orderStatus.status] || orderStatus.status}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="staff-entry">
        <span>Team member?</span>
        <button className="text-btn" onClick={onLogin}>
          Staff / Admin login →
        </button>
      </div>
    </main>
  );
}
