// Test script to verify dashboard API
const testDashboardAPI = async () => {
  try {
    const response = await fetch('/api/dashboard/stats');
    const data = await response.json();
    
    console.log('Dashboard API Response:', data);
    
    // Check if all required fields exist and are numbers
    const requiredFields = [
      'totalRevenue', 'gasSales', 'cylinderRefills', 'totalDue',
      'totalCustomers', 'totalEmployees', 'totalProducts', 
      'productsSold', 'totalSales', 'totalCombinedRevenue', 'totalPaid'
    ];
    
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null
    );
    
    const nonNumericFields = requiredFields.filter(field => 
      typeof data[field] !== 'number' || isNaN(data[field])
    );
    
    if (missingFields.length > 0) {
      console.error('Missing fields:', missingFields);
    }
    
    if (nonNumericFields.length > 0) {
      console.error('Non-numeric fields:', nonNumericFields);
    }
    
    if (missingFields.length === 0 && nonNumericFields.length === 0) {
      console.log('✅ All fields are present and numeric');
      console.log('✅ Dashboard API is working correctly');
    }
    
  } catch (error) {
    console.error('❌ Dashboard API test failed:', error);
  }
};

// To use this script, run it in your browser console on the dashboard page
console.log('Dashboard API Test Script loaded. Run testDashboardAPI() to test.');
