export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://inkhakaku.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Stripe Secret Key確認用
    if (
      request.method === "GET" &&
      url.pathname === "/api/debug-stripe"
    ) {
      return new Response(
        JSON.stringify({
          stripeKeyConfigured:
            typeof env.STRIPE_SECRET_KEY === "string" &&
            env.STRIPE_SECRET_KEY.startsWith("sk_"),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Stripe Checkout Session作成
    if (
      request.method === "POST" &&
      url.pathname === "/api/create-checkout-session"
    ) {
      try {
        const body = await request.json();
        const variantId = body.variantId;
        const colors = Array.isArray(body.colors) ? body.colors.filter(c => typeof c === "string" && c.trim()) : [];

        if (!variantId) {
          return new Response(
            JSON.stringify({
              error: "variantId is required",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
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
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
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
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        // 色選択が必要な商品の場合、選択数が正しいか確認
        if (selectedVariant.colorPick) {
          const needed = selectedVariant.colorPick.count;
          if (colors.length !== needed) {
            return new Response(
              JSON.stringify({
                error: `色を${needed}個選択してください`,
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                  ...corsHeaders,
                },
              }
            );
          }
        }

        // 商品名（バリエーション名＋選択色を含める）
        let productName = `${selectedInk.name} ${selectedVariant.label}`;
        if (colors.length) {
          productName += `（${colors.join("・")}）`;
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
                productName,

              "line_items[0][price_data][unit_amount]":
                String(selectedVariant.price),

              "line_items[0][quantity]": "1",

              "shipping_address_collection[allowed_countries][0]": "JP",

              success_url:
                "https://inkhakaku.github.io/homepage/?payment=success",

              cancel_url:
                "https://inkhakaku.github.io/homepage/?payment=cancel",
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
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        return new Response(
          JSON.stringify({
            url: session.url,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
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
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Worker自身の確認
    return new Response(
      "homepage Stripe API is running",
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  },
};
