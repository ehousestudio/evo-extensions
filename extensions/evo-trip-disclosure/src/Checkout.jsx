import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState} from "preact/hooks";

import {
  useBuyerJourneyIntercept,
  useCartLines,
  useSettings,
  useShop,
} from "@shopify/ui-extensions/checkout/preact";

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const cartLines = useCartLines();
  const settings = useSettings();
  const shop = useShop();
  const hasEvoTrip = cartLines.find((cartLine) => cartLine.merchandise.product.productType === settings.product_type);
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);
  const errorMessage =
    (typeof settings?.error_message === "string" &&
      settings?.error_message) ||
    "Agreement must be checked to proceed.";

  if (!hasEvoTrip) return;

  // Block or allow progress based on agreement checkbox
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    // Block progress if agreement is unchecked
    if (canBlockProgress && !isAgreementChecked) {
      return {
        behavior: 'block',
        reason: errorMessage,
        errors: [
          {
            message: errorMessage,
          },
        ],
      };
    } else {
      return {
        behavior: 'allow'
      };
    }
  });

  return (
    <>
      <s-grid
        alignContent="start"
        gridTemplateColumns="18px auto"
        gap="base"
      >
        <s-grid-item>
          <s-checkbox
            checked={isAgreementChecked}
            onChange={(event) => {
              setIsAgreementChecked(event.target.checked);
            }}
            required
          >
          </s-checkbox>
        </s-grid-item>

        <s-grid-item>
          <s-text>
            {settings?.text}

            {settings?.link_text != '' && settings?.link != '' && (
              <s-link href={`${shop?.storefrontUrl}${settings?.link}`}>
                {settings?.link_text}
              </s-link>
            )}
          </s-text>
        </s-grid-item>
      </s-grid>
    </>
  );
}