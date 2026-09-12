export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Stripe Checkout Session作成
    if (
      request.method === "POST" &&
      url.pathname === "/api/create-checkout-session"
    ) {
      try {
        const body = await request.json();
        const variantId = body.variantId;

        if (!variantId) {
          return new Response(
            JSON.stringify({ error: "variantId is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // GitHubの商品データを取得
        const dataResponse = await fetch(
          "https://raw.githubusercontent.com/inkhakaku/homepage/main/data/inks.json"
        );

        if (!dataResponse.ok) {
          return new Response(
            JSON.stringify({
              error: "商品データを取得できませんでした",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const inks = await dataResponse.json();

        // variantIdから商品を検索
        let selectedInk = null;
        let selectedVariant = null;

        for (const ink of inks) {
          const variant = ink.variants?.find(
            (item) => item.id === variantId
          );

          if (variant) {
            selectedInk = ink;
            selectedVariant = variant;
            break;
          }
        }

        if (!selectedInk || !selectedVariant) {
          return new Response(
            JSON.stringify({
              error: "商品が見つかりません",
            }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Stripe Checkout Session作成
        const stripeResponse = await fetch(
          "https://api.stripe.com/v1/checkout/sessions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              mode: "payment",
              "line_items[0][price_data][currency]": "jpy",
              "line_items[0][price_data][product_data][name]":
                selectedInk.name,
              "line_items[0][price_data][unit_amount]":
                String(selectedVariant.price),
              "line_items[0][quantity]": "1",
              success_url: `${url.origin}/?payment=success`,
              cancel_url: `${url.origin}/?payment=cancel`,
            }),
          }
        );

        const session = await stripeResponse.json();

        if (!stripeResponse.ok) {
          return new Response(
            JSON.stringify({
              error:
                session.error?.message ||
                "Stripe決済の作成に失敗しました",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({ url: session.url }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            error:
              error.message ||
              "サーバーエラーが発生しました",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Worker自身の確認
    return new Response("homepage Worker is running");
  },
};
