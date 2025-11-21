import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState} from "preact/hooks";

import {
  useBuyerJourneyIntercept,
  useCartLines,
  useSettings,
  useShop,
  useApplyAttributeChange,
} from "@shopify/ui-extensions/checkout/preact";

export default function extension() {
  render(<Extension />, document.body)
};

function Extension() {
  const cartLines = useCartLines();
  const settings = useSettings();
  const shop = useShop();
  const applyAttributeChange = useApplyAttributeChange();
  const hasEvoTrip = cartLines.find((cartLine) => cartLine.merchandise?.product?.productType === settings?.product_type);
  const [isAgreementChecked, setIsAgreementChecked] = useState();
  const errorMessage =
    (typeof settings?.error_message === "string" &&
      settings?.error_message) ||
    "Agreement must be checked to proceed.";

  // Block or allow progress based on agreement checkbox
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (!canBlockProgress) return;

    // Block progress if agreement is unchecked
    if (hasEvoTrip && canBlockProgress && !isAgreementChecked) {
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

  function handleCheckboxChange(checked) {
    setIsAgreementChecked(checked);

    applyAttributeChange({
      key: 'evo_agreement',
      type: 'updateAttribute',
      value: `${checked}`
    });
  }

  if (!hasEvoTrip) return;

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
            onChange={(event) => handleCheckboxChange(event.target.checked)}
            required
          >
          </s-checkbox>
        </s-grid-item>

        <s-grid-item>
          <s-text>
            {settings?.text}

            {settings?.link_text && settings?.link && (
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