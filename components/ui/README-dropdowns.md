# Reusable Dropdown Components

This directory contains reusable dropdown components that can be used across the application to select customers, products, and other entities.

## CustomerDropdown

A dropdown component for selecting customers from the database.

### Features

- Fetches customers directly from MongoDB via API
- Loading states and comprehensive error handling
- Customizable placeholder text
- Optional detail display (phone, email)
- Responsive design with icons
- TypeScript support

### Usage

```tsx
import { CustomerDropdown } from "@/components/ui/customer-dropdown";

function MyComponent() {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  return (
    <div>
      <Label>Select Customer</Label>
      <CustomerDropdown
        selectedCustomerId={selectedCustomerId}
        onSelect={setSelectedCustomerId}
        placeholder="Choose a customer"
        showDetails={true}
        disabled={false}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedCustomerId` | `string` | - | Currently selected customer ID |
| `onSelect` | `(id: string) => void` | - | Callback when customer is selected |
| `placeholder` | `string` | "Select a customer" | Placeholder text |
| `showDetails` | `boolean` | `true` | Show phone/email in dropdown |
| `disabled` | `boolean` | `false` | Disable the dropdown |

## ProductDropdown

A dropdown component for selecting products from the database.

### Features

- Fetches products directly from MongoDB via API
- Category filtering (gas, cylinder, etc.)
- Product details display (category, stock, price)
- Loading states and comprehensive error handling
- TypeScript support

### Usage

```tsx
import { ProductDropdown } from "@/components/ui/product-dropdown";

function MyComponent() {
  const [selectedProductId, setSelectedProductId] = useState("");

  return (
    <div>
      <Label>Select Product</Label>
      <ProductDropdown
        selectedProductId={selectedProductId}
        onSelect={setSelectedProductId}
        categoryFilter="gas"
        placeholder="Choose a gas product"
        showDetails={true}
        disabled={false}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedProductId` | `string` | - | Currently selected product ID |
| `onSelect` | `(id: string) => void` | - | Callback when product is selected |
| `placeholder` | `string` | "Select a product" | Placeholder text |
| `categoryFilter` | `string` | - | Filter by category (gas, cylinder) |
| `showDetails` | `boolean` | `true` | Show product details in dropdown |
| `disabled` | `boolean` | `false` | Disable the dropdown |

## Benefits

1. **Consistency**: All dropdowns follow the same design patterns
2. **Reusability**: Use the same component across multiple forms
3. **Error Handling**: Built-in loading states and comprehensive error handling
4. **Database-Driven**: Direct integration with MongoDB for real-time data
5. **Accessibility**: Proper ARIA labels and keyboard navigation
6. **TypeScript**: Full type safety and IntelliSense support
7. **Performance**: Efficient data fetching with proper loading states

## Current Usage

- **Gas Sales Form**: Uses both CustomerDropdown and ProductDropdown
- **Customer Management**: Data source for CustomerDropdown
- **Product Management**: Data source for ProductDropdown

## Future Enhancements

- Add search/filter functionality within dropdowns
- Implement caching with automatic refresh
- Add multi-select variants
- Support for custom rendering of options
- Integration with form validation libraries
