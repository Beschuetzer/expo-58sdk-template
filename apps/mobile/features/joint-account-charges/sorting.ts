import type { JointAccountCharge } from '@expo-50sdk-template/shared-types';

export type JointAccountChargeSortField =
  | 'amount'
  | 'chargeDate'
  | 'createdBy'
  | 'name'
  | 'status';
export type JointAccountChargeSortOrder = 'ascending' | 'descending';

export function sortJointAccountCharges(
  charges: readonly JointAccountCharge[],
  getCreatorName: (charge: JointAccountCharge) => string,
  sortField: JointAccountChargeSortField,
  sortOrder: JointAccountChargeSortOrder,
): JointAccountCharge[] {
  const direction = sortOrder === 'ascending' ? 1 : -1;

  return [...charges].sort((left, right) => {
    let comparison = 0;

    switch (sortField) {
      case 'chargeDate':
        comparison = left.chargeDate.localeCompare(right.chargeDate);
        break;
      case 'name':
        comparison = left.name
          .toLocaleLowerCase()
          .localeCompare(right.name.toLocaleLowerCase());
        break;
      case 'amount':
        comparison = left.amountMinorUnits - right.amountMinorUnits;
        break;
      case 'status':
        comparison = left.status.localeCompare(right.status);
        break;
      case 'createdBy':
        comparison = getCreatorName(left)
          .toLocaleLowerCase()
          .localeCompare(getCreatorName(right).toLocaleLowerCase());
        break;
    }

    return (comparison || left.id.localeCompare(right.id)) * direction;
  });
}
