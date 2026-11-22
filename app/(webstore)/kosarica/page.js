import { isDemoMode } from "@/lib/demoMode";
import { CartPageComponent } from "@/components/webstore/cart";
import React from "react";

function CartPage() {
  return (
    <div>
      <CartPageComponent demoMode={isDemoMode()} />
    </div>
  );
}

export default CartPage;
