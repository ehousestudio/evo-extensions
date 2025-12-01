// @ts-check

/**
 * @typedef {import("../generated/api").CartTransformRunInput} CartTransformRunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 */

/**
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const bundleItems = input.cart.lines.filter((line) => line.bundleParent || line.bundleDiscount);

  return {
    operations: [
      ...Object.values(bundleItems).map((line) => {
        const discountedPrice = line.bundleDiscount?.value && parseInt(line.bundleDiscount?.value) > 0 ? line.cost?.amountPerQuantity?.amount * ((100 - parseInt(line.bundleDiscount.value)) / 100) : line.cost?.amountPerQuantity?.amount;
        const updatedLinePrice = line.bundleParent?.value ? 0 : discountedPrice;

        const updateOperation = {
          lineUpdate: {
            cartLineId: line.id,
            price: {adjustment: {fixedPricePerUnit: {amount: updatedLinePrice}}}
          }
        };

        return updateOperation
      })
    ]
  }
};