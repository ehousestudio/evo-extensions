import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
  useDeliveryGroups,
  useDeliveryGroup,
  useBuyerJourneyIntercept,
  useCartLines,
  useApi,
  useShop,
  useSettings,
} from "@shopify/ui-extensions/checkout/preact";

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const cartLines = useCartLines();
  const { query } = useApi();
  const shop = useShop();
  const settings = useSettings();

  const [productTags, setProductTags] = useState({});

  // Get all delivery groups and use the first one
  const deliveryGroups = useDeliveryGroups();
  const deliveryGroup = useDeliveryGroup(deliveryGroups?.[0]);
  const selectedDeliveryOption = deliveryGroup?.selectedDeliveryOption;

  // Fetch product tags for all products in the cart
  useEffect(() => {
    if (!cartLines?.length) return;

    (async () => {
      try {
        const productIds = [
          ...new Set(cartLines.map((line) => line.merchandise.product.id)),
        ];

        if (!productIds?.length) return;

        const response = await query(
          `query GetProductTags($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                tags
              }
            }
          }`,
          { variables: { ids: productIds } }
        );

        // Check for GraphQL errors
        if (response?.errors) {
          console.error("GraphQL errors:", response.errors);
          return;
        }

        const responseData = response?.data;
        const products =
          responseData &&
          typeof responseData === "object" &&
          "nodes" in responseData &&
          Array.isArray(responseData.nodes)
            ? responseData.nodes
            : [];
        const tagsMap = {};

        products.forEach((product) => {
          if (
            product &&
            typeof product === "object" &&
            "id" in product &&
            "tags" in product &&
            Array.isArray(product.tags)
          ) {
            tagsMap[product.id] = product.tags;
          }
        });

        setProductTags(tagsMap);
      } catch (error) {
        console.error("Error fetching product tags:", error);
        // Don't throw - allow checkout to continue even if tag fetching fails
      }
    })();
  }, []);

  // Check if any product in the cart has a specific tag
  const cartHasTag = (tagName) =>
    Object.values(productTags).some((tags) => tags.includes(tagName));

  // Get settings with fallback defaults
  const enableBlockedCheckoutBanner = settings?.enable_blocked_checkout_banner;
  const enableBlockPickup = settings?.enable_block_pickup;
  const enableBlockShipping = settings?.enable_block_shipping;

  const pickupTag = settings?.pickup_tag || "online exclusive";
  const shippingTag = settings?.shipping_tag || "store exclusive";

  const pickupMessage =
    (typeof settings?.pickup_message === "string" &&
      settings?.pickup_message) ||
    "PICKUP is not available for the item(s) in your cart. Please choose a shipping method.";
  const shippingMessage =
    (typeof settings?.shipping_message === "string" &&
      settings?.shipping_message) ||
    "SHIPPING is not available for the item(s) in your cart. Please choose a pickup option.";

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (!canBlockProgress) return;

    // If no delivery option is selected yet, allow progress
    if (!selectedDeliveryOption) {
      return { behavior: "allow" };
    }

    const isPickup = selectedDeliveryOption?.type === "pickup";
    const isShipping = selectedDeliveryOption?.type === "shipping";

    // Pickup blocked for online exclusive items
    if (isPickup && cartHasTag(pickupTag) && enableBlockPickup == true) {
      return {
        behavior: "block",
        reason: "Pickup is not allowed for items in your cart.",
        errors: [
          {
            message: pickupMessage,
          },
        ],
      };
    }

    // Shipping blocked for store exclusive items
    if (isShipping && cartHasTag(shippingTag) && enableBlockShipping == true) {
      return {
        behavior: "block",
        reason: "Shipping is not allowed for items in your cart.",
        errors: [
          {
            message: shippingMessage,
          },
        ],
      };
    }

    return { behavior: "allow" };
  });

  if (
    cartHasTag(pickupTag) &&
    enableBlockPickup == true &&
    cartHasTag(shippingTag) &&
    enableBlockShipping == true
  ) {
    if (enableBlockedCheckoutBanner == true) {
      return (
        <s-banner tone="warning">
          All items in your cart are either unavailable for pickup or shipping.
          Please modify your{" "}
          <s-link href={`${shop?.storefrontUrl}/cart`}>cart</s-link>.
        </s-banner>
      );
    }
  } else {
    return null;
  }
}
