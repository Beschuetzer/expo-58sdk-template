import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  getAlphabeticalSortValue,
  sortThemeAwareSearchItems,
  ThemeAwareSearch,
} from './ThemeAwareSearch';
import type {
  ThemeAwareSearchLoadMoreConfig,
  ThemeAwareSearchSortConfig,
  ThemeAwareSearchSortOrder,
  ThemeAwareSearchRow,
} from './ThemeAwareSearch';

let mockKeyboardDidHide: (() => void) | undefined;

type SearchTestItem = {
  amount: number;
  date: Date;
  id: string;
  name: string;
};

type SearchTestFilters = {
  fromDate: Date | null;
  maximumAmount: string;
  minimumAmount: string;
  selectedName: string;
  toDate: Date | null;
};

const searchTestItems: SearchTestItem[] = [
  {
    amount: 300,
    date: new Date('2025-01-03T00:00:00.000Z'),
    id: 'alpha',
    name: 'Alpha',
  },
  {
    amount: 100,
    date: new Date('2025-02-01T00:00:00.000Z'),
    id: 'beta',
    name: 'Beta',
  },
  {
    amount: 200,
    date: new Date('2025-03-01T00:00:00.000Z'),
    id: 'gamma',
    name: 'Gamma',
  },
];

const initialSearchTestFilters: SearchTestFilters = {
  fromDate: null,
  maximumAmount: '',
  minimumAmount: '',
  selectedName: 'all',
  toDate: null,
};

jest.mock('react-native', () => ({
  Keyboard: {
    addListener: jest.fn((event: string, listener: () => void) => {
      if (event === 'keyboardDidHide') {
        mockKeyboardDidHide = listener;
      }
      return { remove: jest.fn() };
    }),
  },
  TouchableOpacity: 'TouchableOpacityHost',
}));

jest.mock('@/components/ui/hstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    HStack: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('HStackHost', props, children),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    VStack: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('VStackHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareCollapsible', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareCollapsible: ({
      children,
      collapsed,
      ...props
    }: Record<string, unknown> & {
      children?: React.ReactNode;
      collapsed: boolean;
    }) =>
      React.createElement(
        'CollapsibleHost',
        { ...props, collapsed },
        collapsed ? null : children,
      ),
  };
});

jest.mock('@/components/ui/ThemedModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemedModal: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ThemedModalHost', props, children),
  };
});

jest.mock('@/components/ui/icon', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ChevronsUpDownIcon: 'ChevronsUpDownIconHost',
    ChevronDownIcon: 'ChevronDownIconHost',
    ChevronUpIcon: 'ChevronUpIconHost',
    FilterIcon: 'FilterIconHost',
    Icon: (props: Record<string, unknown>) =>
      React.createElement('IconHost', props),
    SearchIcon: 'SearchIconHost',
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({ textColor: 'theme-text' }),
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        'common.done': 'Done',
        'common.clear': 'Clear',
        'common.filterAndSort': 'Filter and Sort',
        'common.filters': 'Filters',
        'common.search': 'Search',
        'common.sort': 'Sort',
      })[key] ?? key,
  }),
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ButtonHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareTimePicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareTimePicker: (props: Record<string, unknown>) =>
      React.createElement('TimePickerHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareDropdown', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareDropdown: (props: Record<string, unknown>) =>
      React.createElement('DropdownHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareInput: ({
      inputFieldProps,
      ...props
    }: {
      inputFieldProps?: Record<string, unknown>;
      [key: string]: unknown;
    }) => React.createElement('InputHost', { ...inputFieldProps, ...props }),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareText: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('TextHost', props, children),
  };
});

function createSearch(
  compactOnKeyboard = false,
  loadMoreWhileFiltered?: ThemeAwareSearchLoadMoreConfig,
  controlsPresentation: 'collapsible' | 'modal' = 'collapsible',
) {
  return (
    <ThemeAwareSearch<SearchTestItem, SearchTestFilters>
      items={searchTestItems}
      controlsPresentation={controlsPresentation}
      initialFilters={initialSearchTestFilters}
      loadMoreWhileFiltered={loadMoreWhileFiltered}
      filterItems={(items, { filters, search }) => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        const minimumAmount = filters.minimumAmount.trim()
          ? Number(filters.minimumAmount)
          : undefined;
        const maximumAmount = filters.maximumAmount.trim()
          ? Number(filters.maximumAmount)
          : undefined;

        if (
          (minimumAmount !== undefined && !Number.isFinite(minimumAmount)) ||
          (maximumAmount !== undefined && !Number.isFinite(maximumAmount))
        ) {
          return [];
        }

        return items.filter((item) => {
          const date = item.date.getTime();
          return (
            (!normalizedSearch ||
              item.name.toLocaleLowerCase().includes(normalizedSearch)) &&
            (filters.selectedName === 'all' ||
              item.name === filters.selectedName) &&
            (minimumAmount === undefined || item.amount >= minimumAmount) &&
            (maximumAmount === undefined || item.amount <= maximumAmount) &&
            (filters.fromDate === null || date >= filters.fromDate.getTime()) &&
            (filters.toDate === null || date <= filters.toDate.getTime())
          );
        });
      }}
      isFilterStateValid={({ filters }) =>
        (!filters.minimumAmount.trim() ||
          Number.isFinite(Number(filters.minimumAmount))) &&
        (!filters.maximumAmount.trim() ||
          Number.isFinite(Number(filters.maximumAmount)))
      }
      compactOnKeyboard={compactOnKeyboard}
      search={{
        label: 'Search',
        placeholder: 'Search by name',
        inputFieldProps: {
          autoCapitalize: 'none',
          returnKeyType: 'search',
        },
      }}
      filterRows={[
        {
          id: 'name',
          fields: [
            {
              type: 'dropdown',
              filterKey: 'selectedName',
              label: 'Name',
              placeholder: 'Name',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Alpha', value: 'Alpha' },
                { label: 'Beta', value: 'Beta' },
              ],
            },
          ],
        },
        {
          id: 'dates',
          fields: [
            {
              type: 'date',
              filterKey: 'fromDate',
              label: 'From date',
              accessibilityLabel: 'From date',
              clearable: true,
            },
            {
              type: 'date',
              filterKey: 'toDate',
              label: 'To date',
              accessibilityLabel: 'To date',
              clearable: true,
            },
          ],
        },
        {
          id: 'amount',
          keyboardGroup: 'amount',
          fields: [
            {
              type: 'input',
              filterKey: 'minimumAmount',
              label: 'Minimum amount',
              inputFieldProps: {
                keyboardType: 'decimal-pad',
                placeholder: 'Amount',
              },
            },
            {
              type: 'input',
              filterKey: 'maximumAmount',
              label: 'Maximum amount',
              inputFieldProps: {
                keyboardType: 'decimal-pad',
                placeholder: 'Amount',
              },
            },
          ],
        },
        {
          id: 'amount-error',
          keyboardGroup: 'amount',
          message: 'Invalid amount',
          showWhen: ({ filters }) =>
            Boolean(
              filters.minimumAmount &&
                !Number.isFinite(Number(filters.minimumAmount)),
            ) ||
            Boolean(
              filters.maximumAmount &&
                !Number.isFinite(Number(filters.maximumAmount)),
            ),
          textProps: { color: '$error600', size: 'sm' },
        },
      ]}
      sort={{
        field: {
          label: 'Sort by',
          initialValue: 'name',
          placeholder: 'Sort by',
          options: [
            {
              label: 'Name',
              value: 'name',
              getValue: (item) => item.name,
            },
            {
              label: 'Date',
              value: 'date',
              getValue: (item) => item.date,
            },
            {
              label: 'Amount',
              value: 'amount',
              getValue: (item) => item.amount,
            },
          ],
        },
        order: {
          label: 'Sort order',
          initialValue: 'ascending',
          placeholder: 'Sort order',
          options: [
            { label: 'Ascending', value: 'ascending' },
            { label: 'Descending', value: 'descending' },
          ],
        },
        tieBreaker: (left, right) => left.id.localeCompare(right.id),
      }}
      clearFilters={{
        label: 'Clear filters',
        variant: 'outline',
      }}
    >
      {({ items, searchControls, hasActiveFilters, isFilterStateValid }) => (
        <>
          {searchControls}
          {React.createElement('ResultsHost', {
            hasActiveFilters,
            isFilterStateValid,
            ids: items.map(({ id }) => id),
          })}
        </>
      )}
    </ThemeAwareSearch>
  );
}

function expandSearchOptions(screen: ReactTestRenderer) {
  const toggle = screen.root.find(
    (instance) => String(instance.type) === 'TouchableOpacityHost',
  );
  act(() => toggle.props.onPress());
}

function findControl(screen: ReactTestRenderer, label: string) {
  return screen.root.find(
    (instance) =>
      String(instance.type) === 'TouchableOpacityHost' &&
      instance.props.accessibilityLabel === label,
  );
}

function openSearchModal(screen: ReactTestRenderer, label: string) {
  act(() => findControl(screen, label).props.onPress());
}

function closeSearchModal(screen: ReactTestRenderer) {
  const modal = screen.root.find(
    (instance) => String(instance.type) === 'ThemedModalHost',
  );
  act(() => modal.props.confirmButton.onPress());
}

describe('ThemeAwareSearch', () => {
  afterEach(() => {
    mockKeyboardDidHide = undefined;
    jest.clearAllMocks();
  });

  it('starts with filter and sort options collapsed and toggles them from the header', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(createSearch());
    });

    const toggle = screen!.root.find(
      (instance) => String(instance.type) === 'TouchableOpacityHost',
    );
    expect(toggle.props.accessibilityLabel).toBe('Filter and Sort');
    expect(toggle.props.accessibilityState).toEqual({ expanded: false });
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TouchableOpacityHost',
      ),
    ).toHaveLength(1);
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(0);
    expect(
      screen!.root.find((instance) => String(instance.type) === 'IconHost')
        .props.as,
    ).toBe('ChevronDownIconHost');
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TextHost',
      )[0].props.children,
    ).toBe('Filter and Sort');

    act(() => toggle.props.onPress());
    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'CollapsibleHost',
      ).props.collapsed,
    ).toBe(false);
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(3);
    expect(
      screen!.root.find((instance) => String(instance.type) === 'IconHost')
        .props.as,
    ).toBe('ChevronUpIconHost');

    act(() =>
      screen!.root
        .find((instance) => String(instance.type) === 'TouchableOpacityHost')
        .props.onPress(),
    );
    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'CollapsibleHost',
      ).props.collapsed,
    ).toBe(true);
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(0);

    act(() => screen!.unmount());
  });

  it('opens separate search, filter, and sort modals from icon buttons', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(createSearch(false, undefined, 'modal'));
    });

    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TouchableOpacityHost')
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(['Search', 'Filters', 'Sort']);
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(0);

    openSearchModal(screen!, 'Search');
    let modal = screen!.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.title).toBe('Search');
    expect(modal.props.cancelButton).toBeUndefined();
    const searchInput = screen!.root.find(
      (instance) =>
        String(instance.type) === 'InputHost' &&
        instance.props.placeholder === 'Search by name',
    );
    act(() => searchInput.props.onChangeText('beta'));
    expect(
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props.ids,
    ).toEqual(['beta']);
    modal = screen!.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.cancelButton).toMatchObject({
      action: 'secondary',
      text: 'Clear',
    });
    act(() => modal.props.cancelButton.onPress());
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'InputHost' &&
          instance.props.placeholder === 'Search by name',
      ).props.value,
    ).toBe('');
    expect(
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props.ids,
    ).toEqual(['alpha', 'beta', 'gamma']);
    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemedModalHost',
      ).props.cancelButton,
    ).toBeUndefined();
    closeSearchModal(screen!);

    openSearchModal(screen!, 'Filters');
    modal = screen!.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.title).toBe('Filters');
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      ),
    ).toHaveLength(2);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'DropdownHost',
      ),
    ).toHaveLength(1);
    const nameFilter = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'Name',
    );
    act(() => nameFilter.props.onValueChange('Alpha'));
    expect(
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props.ids,
    ).toEqual(['alpha']);

    const clearButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'Clear filters',
    );
    act(() => clearButton.props.onPress());
    expect(
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props.ids,
    ).toEqual(['alpha', 'beta', 'gamma']);
    closeSearchModal(screen!);

    openSearchModal(screen!, 'Sort');
    modal = screen!.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.title).toBe('Sort');
    const sortField = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'Sort by',
    );
    act(() => sortField.props.onValueChange('amount'));
    expect(
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props.ids,
    ).toEqual(['beta', 'gamma', 'alpha']);

    act(() => screen!.unmount());
  });

  it('owns search, filter, sort, and clear state and returns sorted matches', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(createSearch());
    });
    expandSearchOptions(screen!);

    const getResults = () =>
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props;
    const searchInput = screen!.root.find(
      (instance) =>
        String(instance.type) === 'InputHost' &&
        instance.props.placeholder === 'Search by name',
    );
    expect(searchInput.props.value).toBe('');
    expect(getResults().ids).toEqual(['alpha', 'beta', 'gamma']);
    act(() => searchInput.props.onChangeText('beta'));
    expect(getResults().ids).toEqual(['beta']);
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'InputHost' &&
          instance.props.placeholder === 'Search by name',
      ).props.value,
    ).toBe('beta');
    act(() =>
      screen!.root
        .find(
          (instance) =>
            String(instance.type) === 'InputHost' &&
            instance.props.placeholder === 'Search by name',
        )
        .props.onChangeText(''),
    );

    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      ),
    ).toHaveLength(2);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'DropdownHost',
      ),
    ).toHaveLength(3);
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(3);

    const minimumAmountInput = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'InputHost' &&
        instance.props.keyboardType === 'decimal-pad',
    )[0];
    act(() => minimumAmountInput.props.onChangeText('200'));
    expect(getResults().ids).toEqual(['alpha', 'gamma']);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'Clear filters',
      ),
    ).toHaveLength(1);

    const sortField = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'Sort by',
    );
    act(() => sortField.props.onValueChange('amount'));
    expect(getResults().ids).toEqual(['gamma', 'alpha']);

    const sortOrder = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'Sort order',
    );
    act(() => sortOrder.props.onValueChange('descending'));
    expect(getResults().ids).toEqual(['alpha', 'gamma']);

    const fromDate = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TimePickerHost' &&
        instance.props.accessibilityLabel === 'From date',
    );
    act(() =>
      fromDate.props.onChange(
        { type: 'set' },
        new Date('2025-02-01T00:00:00.000Z'),
      ),
    );
    expect(getResults().ids).toEqual(['gamma']);
    expect(getResults().hasActiveFilters).toBe(true);

    const clearButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'Clear filters',
    );
    act(() => clearButton.props.onPress());
    expect(getResults().ids).toEqual(['alpha', 'gamma', 'beta']);
    expect(getResults().hasActiveFilters).toBe(false);
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'DropdownHost' &&
          instance.props.placeholder === 'Sort by',
      ).props.selectedValue,
    ).toBe('amount');
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'DropdownHost' &&
          instance.props.placeholder === 'Sort order',
      ).props.selectedValue,
    ).toBe('descending');
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'TimePickerHost' &&
          instance.props.accessibilityLabel === 'From date',
      ).props.value,
    ).toBeNull();
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'Clear filters',
      ),
    ).toHaveLength(0);

    act(() => screen!.unmount());
  });

  it('loads more pages for valid active filters but not invalid filters', () => {
    const fetchNextPage = jest.fn();
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        createSearch(false, {
          fetchNextPage,
          hasNextPage: true,
          isFetchingNextPage: false,
          isFetchNextPageError: false,
        }),
      );
    });
    expandSearchOptions(screen!);

    const getMinimumAmountInput = () =>
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'InputHost' &&
          instance.props.keyboardType === 'decimal-pad',
      )[0];

    act(() => getMinimumAmountInput().props.onChangeText('invalid'));
    expect(fetchNextPage).not.toHaveBeenCalled();

    act(() => getMinimumAmountInput().props.onChangeText('200'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    act(() => screen!.unmount());
  });

  it('updates dropdown filters and ignores dismissed or empty date selections', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(createSearch());
    });
    expandSearchOptions(screen!);

    const getResults = () =>
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props;
    const nameFilter = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'Name',
    );
    expect(nameFilter.props.selectedValue).toBe('all');
    act(() => nameFilter.props.onValueChange('Alpha'));
    expect(getResults().ids).toEqual(['alpha']);
    expect(getResults().hasActiveFilters).toBe(true);

    act(() => nameFilter.props.onValueChange('unknown'));
    expect(nameFilter.props.selectedValue).toBe('Alpha');

    const fromDate = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TimePickerHost' &&
        instance.props.accessibilityLabel === 'From date',
    );
    const date = new Date('2025-02-01T00:00:00.000Z');
    act(() => fromDate.props.onChange({ type: 'dismissed' }, date));
    expect(fromDate.props.value).toBeNull();
    act(() => fromDate.props.onChange({ type: 'set' }, undefined));
    expect(fromDate.props.value).toBeNull();
    act(() => fromDate.props.onClear());
    expect(fromDate.props.value).toBeNull();

    const clearButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'Clear filters',
    );
    act(() => clearButton.props.onPress());
    expect(getResults().ids).toEqual(['alpha', 'beta', 'gamma']);
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'DropdownHost' &&
          instance.props.placeholder === 'Name',
      ).props.selectedValue,
    ).toBe('all');

    act(() => screen!.unmount());
  });

  it('compares date filters by timestamp and validates filter value types', () => {
    type DateFilters = { fromDate: Date | null };
    const initialDate = new Date('2025-01-01T00:00:00.000Z');
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ThemeAwareSearch<SearchTestItem, DateFilters>
          items={searchTestItems}
          initialFilters={{ fromDate: initialDate }}
          filterItems={(items) => items}
          search={{ label: 'Search', placeholder: 'Search' }}
          filterRows={[
            {
              id: 'date',
              fields: [
                { type: 'date', filterKey: 'fromDate', label: 'From date' },
              ],
            },
          ]}
        >
          {({ hasActiveFilters, searchControls }) => (
            <>
              {searchControls}
              {React.createElement('ResultsHost', { hasActiveFilters })}
            </>
          )}
        </ThemeAwareSearch>,
      );
    });
    expandSearchOptions(screen!);

    const getResults = () =>
      screen!.root.find((instance) => String(instance.type) === 'ResultsHost')
        .props;
    const fromDate = screen!.root.find(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    act(() =>
      fromDate.props.onChange({ type: 'set' }, new Date(initialDate.getTime())),
    );
    expect(getResults().hasActiveFilters).toBe(false);
    act(() =>
      fromDate.props.onChange(
        { type: 'set' },
        new Date(initialDate.getTime() + 24 * 60 * 60 * 1000),
      ),
    );
    expect(getResults().hasActiveFilters).toBe(true);
    act(() => screen!.unmount());

    const renderSearchWithFilters = <FilterValuesT extends object>(
      initialFilters: FilterValuesT,
      filterRows: ThemeAwareSearchRow<FilterValuesT>[],
    ) =>
      renderer.create(
        <ThemeAwareSearch<SearchTestItem, FilterValuesT>
          items={searchTestItems}
          initialFilters={initialFilters}
          filterItems={(items) => items}
          search={{ label: 'Search', placeholder: 'Search' }}
          filterRows={filterRows}
        >
          {() => null}
        </ThemeAwareSearch>,
      );

    const invalidTextFilters = { amount: '' };
    Object.assign(invalidTextFilters, { amount: 42 });
    expect(() =>
      renderSearchWithFilters(invalidTextFilters, [
        {
          id: 'amount',
          fields: [{ type: 'input', filterKey: 'amount', label: 'Amount' }],
        },
      ]),
    ).toThrow('ThemeAwareSearch text filter "amount" must be a string.');

    const invalidDropdownFilters = { amount: 'all' };
    Object.assign(invalidDropdownFilters, { amount: 42 });
    expect(() =>
      renderSearchWithFilters(invalidDropdownFilters, [
        {
          id: 'amount',
          fields: [
            {
              type: 'dropdown',
              filterKey: 'amount',
              label: 'Amount',
              placeholder: 'Amount',
              options: [{ label: 'All', value: 'all' }],
            },
          ],
        },
      ]),
    ).toThrow('ThemeAwareSearch dropdown filter "amount" must be a string.');

    const invalidDateFilters: { fromDate: Date | null } = { fromDate: null };
    Object.assign(invalidDateFilters, { fromDate: 'invalid' });
    expect(() =>
      renderSearchWithFilters(invalidDateFilters, [
        {
          id: 'date',
          fields: [{ type: 'date', filterKey: 'fromDate', label: 'From date' }],
        },
      ]),
    ).toThrow(
      'ThemeAwareSearch date filter "fromDate" must be a date or null.',
    );
  });

  it('shows only the active filter group while the keyboard is open', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(createSearch(true));
    });
    expandSearchOptions(screen!);

    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(3);

    const searchInput = screen!.root.find(
      (instance) =>
        String(instance.type) === 'InputHost' &&
        instance.props.placeholder === 'Search by name',
    );
    act(() => searchInput.props.onFocus());

    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(1);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'DropdownHost',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ButtonHost',
      ),
    ).toHaveLength(0);

    act(() => mockKeyboardDidHide?.());
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      ),
    ).toHaveLength(2);

    const minimumAmountInput = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'InputHost' &&
        instance.props.keyboardType === 'decimal-pad',
    )[0];
    act(() => minimumAmountInput.props.onChangeText('invalid'));

    const amountInput = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'InputHost' &&
        instance.props.keyboardType === 'decimal-pad',
    )[0];
    act(() => amountInput.props.onFocus());

    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'InputHost')
        .map((input) => input.props.placeholder),
    ).toEqual(['Amount', 'Amount']);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'TextHost' &&
          instance.props.children === 'Invalid amount',
      ),
    ).toHaveLength(1);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'DropdownHost',
      ),
    ).toHaveLength(0);

    act(() => mockKeyboardDidHide?.());
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(3);

    act(() => screen!.unmount());
  });

  it('sorts configured properties in ascending and descending order', () => {
    type SortableItem = {
      amount: number;
      id: string;
      name: string;
      purchaseDate: Date;
    };

    const items: SortableItem[] = [
      {
        id: 'request-3',
        name: 'Beta',
        purchaseDate: new Date('2025-03-01T00:00:00.000Z'),
        amount: 200,
      },
      {
        id: 'request-2',
        name: 'alpha',
        purchaseDate: new Date('2025-02-01T00:00:00.000Z'),
        amount: 100,
      },
      {
        id: 'request-1',
        name: 'Alpha',
        purchaseDate: new Date('2025-01-01T00:00:00.000Z'),
        amount: 100,
      },
    ];
    const sortConfig: ThemeAwareSearchSortConfig<SortableItem> = {
      field: {
        label: 'Sort by',
        initialValue: 'amount',
        placeholder: 'Sort by',
        options: [
          {
            label: 'Purchase date',
            value: 'date',
            getValue: (item) => item.purchaseDate,
          },
          {
            label: 'Name',
            value: 'name',
            getValue: (item) => item.name,
          },
          {
            label: 'Amount',
            value: 'amount',
            getValue: (item) => item.amount,
          },
        ],
      },
      order: {
        label: 'Sort order',
        initialValue: 'ascending',
        placeholder: 'Sort order',
        options: [
          { label: 'Ascending', value: 'ascending' },
          { label: 'Descending', value: 'descending' },
        ],
      },
      tieBreaker: (left, right) => left.id.localeCompare(right.id),
    };

    expect(
      sortThemeAwareSearchItems(items, sortConfig).map(({ id }) => id),
    ).toEqual(['request-1', 'request-2', 'request-3']);
    expect(
      sortThemeAwareSearchItems(items, sortConfig, 'amount', 'descending').map(
        ({ id }) => id,
      ),
    ).toEqual(['request-3', 'request-1', 'request-2']);
    expect(
      sortThemeAwareSearchItems(items, sortConfig, 'name', 'ascending').map(
        ({ id }) => id,
      ),
    ).toEqual(['request-1', 'request-2', 'request-3']);
    expect(
      sortThemeAwareSearchItems(items, sortConfig, 'date', 'ascending').map(
        ({ id }) => id,
      ),
    ).toEqual(['request-1', 'request-2', 'request-3']);
    expect(items.map(({ id }) => id)).toEqual([
      'request-3',
      'request-2',
      'request-1',
    ]);
  });

  it('sorts nullable values stably and rejects invalid sort configurations', () => {
    type SortableValue = {
      id: string;
      value: string | number | Date | null;
    };
    const sortConfig: ThemeAwareSearchSortConfig<SortableValue> = {
      field: {
        label: 'Sort by',
        initialValue: 'value',
        placeholder: 'Sort by',
        options: [
          {
            label: 'Value',
            value: 'value',
            getValue: (item) => item.value,
          },
        ],
      },
      order: {
        label: 'Sort order',
        initialValue: 'ascending',
        placeholder: 'Sort order',
        options: [{ label: 'Ascending', value: 'ascending' }],
      },
    };
    const nullableItems: SortableValue[] = [
      { id: 'one', value: 1 },
      { id: 'null-first', value: null },
      { id: 'null-second', value: null },
    ];

    expect(
      sortThemeAwareSearchItems(nullableItems, sortConfig).map(({ id }) => id),
    ).toEqual(['one', 'null-first', 'null-second']);
    expect(() =>
      sortThemeAwareSearchItems(nullableItems, sortConfig, 'missing'),
    ).toThrow('ThemeAwareSearch has no sort option for "missing".');
    expect(() =>
      sortThemeAwareSearchItems(
        nullableItems,
        sortConfig,
        'value',
        'sideways' as ThemeAwareSearchSortOrder,
      ),
    ).toThrow('ThemeAwareSearch has no sort order for "sideways".');

    const stableSortConfig: ThemeAwareSearchSortConfig<SortableValue> = {
      ...sortConfig,
      tieBreaker: () => 0,
    };
    const equalItems = [
      { id: 'first', value: 'same' },
      { id: 'second', value: 'same' },
    ];
    expect(
      sortThemeAwareSearchItems(equalItems, stableSortConfig).map(
        ({ id }) => id,
      ),
    ).toEqual(['first', 'second']);

    const customCompareConfig: ThemeAwareSearchSortConfig<SortableValue> = {
      ...sortConfig,
      field: {
        ...sortConfig.field,
        options: [
          {
            ...sortConfig.field.options[0],
            compareValues: (left, right) =>
              String(left).localeCompare(String(right)),
          },
        ],
      },
    };
    expect(
      sortThemeAwareSearchItems(nullableItems, customCompareConfig),
    ).toHaveLength(nullableItems.length);

    const invalidDateItems: SortableValue[] = [
      { id: 'invalid-date-1', value: new Date(Number.NaN) },
      { id: 'invalid-date-2', value: new Date(Number.NaN) },
    ];
    expect(() =>
      sortThemeAwareSearchItems(invalidDateItems, sortConfig),
    ).toThrow('ThemeAwareSearch sort values must be valid dates.');

    const invalidNumberItems: SortableValue[] = [
      { id: 'invalid-number-1', value: Number.NaN },
      { id: 'invalid-number-2', value: Number.NaN },
    ];
    expect(() =>
      sortThemeAwareSearchItems(invalidNumberItems, sortConfig),
    ).toThrow('ThemeAwareSearch sort values must be finite.');

    const mixedItems: SortableValue[] = [
      { id: 'string', value: 'one' },
      { id: 'number', value: 1 },
    ];
    expect(() => sortThemeAwareSearchItems(mixedItems, sortConfig)).toThrow(
      'ThemeAwareSearch sort values must use a consistent supported type.',
    );

    const invalidComparatorConfig: ThemeAwareSearchSortConfig<SortableValue> = {
      ...sortConfig,
      field: {
        ...sortConfig.field,
        options: [
          {
            ...sortConfig.field.options[0],
            compareValues: () => Number.NaN,
          },
        ],
      },
    };
    expect(() =>
      sortThemeAwareSearchItems(nullableItems, invalidComparatorConfig),
    ).toThrow('ThemeAwareSearch sort comparators must return finite numbers.');

    const invalidTieBreakerConfig: ThemeAwareSearchSortConfig<SortableValue> = {
      ...sortConfig,
      tieBreaker: () => Number.POSITIVE_INFINITY,
    };
    expect(() =>
      sortThemeAwareSearchItems(equalItems, invalidTieBreakerConfig),
    ).toThrow('ThemeAwareSearch sort tie-breakers must return finite numbers.');
  });

  it('creates an alphabetical sort value for unordered labels without mutating them', () => {
    const labels = ['Zulu', 'alpha'];

    expect(getAlphabeticalSortValue(labels)).toBe('alpha, Zulu');
    expect(labels).toEqual(['Zulu', 'alpha']);
  });
});
