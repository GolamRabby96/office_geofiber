import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileUpload from './FileUpload';

const API_URL = '/api';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('points');
  const [points, setPoints] = useState([]);
  const [pops, setPops] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingPops, setLoadingPops] = useState(true);

  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    latitude: '',
    longitude: '',
    details: '',
    pop_id: ''
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  useEffect(() => {
    fetchPoints();
    fetchCustomers();
    fetchPops();
  }, []);

  const fetchPoints = async () => {
    try {
      const response = await axios.get(`${API_URL}/upload/points`);
      setPoints(response.data);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPops = async () => {
    try {
      const response = await axios.get(`${API_URL}/upload/points`);
      const allPops = response.data.filter(p => p.type === 'POP');
      setPops(allPops);
    } catch (error) {
      console.error('Error fetching POPs:', error);
    } finally {
      setLoadingPops(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const clearAllPoints = async () => {
    if (!window.confirm('Are you sure you want to delete ALL distribution points? This cannot be undone.')) return;

    try {
      await axios.delete(`${API_URL}/upload/points`);
      setPoints([]);
      alert('All points deleted successfully');
    } catch (error) {
      alert('Failed to delete points');
    }
  };

  const deletePoint = async (id) => {
    if (!window.confirm('Are you sure you want to delete this point?')) return;

    try {
      await axios.delete(`${API_URL}/upload/points/${id}`);
      setPoints(points.filter(p => p._id !== id));
    } catch (error) {
      alert('Failed to delete point');
    }
  };

  const handleCustomerInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm(prev => ({ ...prev, [name]: value }));
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      customer_name: '',
      latitude: '',
      longitude: '',
      details: '',
      pop_id: ''
    });
    setEditingCustomer(null);
  };

  const saveCustomer = async () => {
    const { customer_name, latitude, longitude, details, pop_id } = customerForm;

    if (!customer_name || !latitude || !longitude || !pop_id) {
      alert('customer_name, latitude, longitude, and pop_id are required');
      return;
    }

    setSavingCustomer(true);
    try {
      if (editingCustomer) {
        await axios.put(`${API_URL}/customers/${editingCustomer._id}`, {
          customer_name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          details,
          pop_id
        });
      } else {
        await axios.post(`${API_URL}/customers`, {
          customer_name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          details,
          pop_id
        });
      }
      await fetchCustomers();
      resetCustomerForm();
      alert(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingCustomer(false);
    }
  };

  const editCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      customer_name: customer.customer_name || '',
      latitude: customer.latitude?.toString() || '',
      longitude: customer.longitude?.toString() || '',
      details: customer.details || '',
      pop_id: customer.pop_id?._id || customer.pop_id || ''
    });
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      await axios.delete(`${API_URL}/customers/${id}`);
      setCustomers(customers.filter(c => c._id !== id));
    } catch (error) {
      alert('Failed to delete customer');
    }
  };

  const clearAllCustomers = async () => {
    if (!window.confirm('Are you sure you want to delete ALL customers? This cannot be undone.')) return;

    try {
      await axios.delete(`${API_URL}/customers`);
      setCustomers([]);
    } catch (error) {
      alert('Failed to delete customers');
    }
  };

  const tabStyle = {
    padding: '12px 24px',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#555'
  };

  const activeTabStyle = {
    ...tabStyle,
    borderBottom: '3px solid #1565c0',
    color: '#1565c0'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical'
  };

  const buttonStyle = {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f5f5f5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#333' }}>Admin Panel</h2>
            <div style={{ display: 'flex', gap: '4px', background: '#e0e0e0', borderRadius: '8px', padding: '4px' }}>
              <div style={activeTab === 'points' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('points')}>Distribution Points</div>
              <div style={activeTab === 'customers' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('customers')}>Customers</div>
            </div>
          </div>

          {activeTab === 'points' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>Distribution Points ({points.length})</h3>
                <button onClick={clearAllPoints} style={{ ...buttonStyle, background: '#f44336', color: 'white' }}>
                  Clear All Points
                </button>
              </div>

              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>Upload Excel Data</h3>
                <FileUpload onUploadSuccess={fetchPoints} />
              </div>

              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>All Distribution Points ({points.length})</h3>
                {loading ? (
                  <p>Loading...</p>
                ) : points.length === 0 ? (
                  <p style={{ color: '#666' }}>No points loaded. Upload an Excel file to get started.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Latitude</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Longitude</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Address</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {points.map((point) => (
                          <tr key={point._id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px' }}>{point.name}</td>
                            <td style={{ padding: '12px' }}>
                              {point.type ? (
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  background: point.type === 'POP' ? '#e91e63' : '#ff9800',
                                  color: 'white'
                                }}>
                                  {point.type}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '12px' }}>{point.latitude.toFixed(6)}</td>
                            <td style={{ padding: '12px' }}>{point.longitude.toFixed(6)}</td>
                            <td style={{ padding: '12px' }}>{point.address || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button onClick={() => deletePoint(point._id)} style={{ ...buttonStyle, background: '#f44336', color: 'white', fontSize: '12px' }}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'customers' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>Customers ({customers.length})</h3>
                <button onClick={resetCustomerForm} style={{ ...buttonStyle, background: '#607d8b', color: 'white' }}>
                  + New Customer
                </button>
              </div>

              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Customer Name *</label>
                    <input type="text" name="customer_name" value={customerForm.customer_name} onChange={handleCustomerInputChange} style={inputStyle} placeholder="Enter customer name" />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Details</label>
                    <textarea name="details" value={customerForm.details} onChange={handleCustomerInputChange} style={textareaStyle} placeholder="Enter details"></textarea>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Latitude *</label>
                    <input type="number" step="any" name="latitude" value={customerForm.latitude} onChange={handleCustomerInputChange} style={inputStyle} placeholder="e.g. 23.8103" />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Longitude *</label>
                    <input type="number" step="any" name="longitude" value={customerForm.longitude} onChange={handleCustomerInputChange} style={inputStyle} placeholder="e.g. 90.4125" />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>POP *</label>
                    <select name="pop_id" value={customerForm.pop_id} onChange={handleCustomerInputChange} style={inputStyle} disabled={loadingPops}>
                      <option value="">-- Select a POP --</option>
                      {pops.map(pop => (
                        <option key={pop._id} value={pop._id}>{pop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button onClick={saveCustomer} disabled={savingCustomer} style={{ ...buttonStyle, background: '#4caf50', color: 'white' }}>
                    {savingCustomer ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Create Customer')}
                  </button>
                  <button onClick={resetCustomerForm} style={{ ...buttonStyle, background: '#9e9e9e', color: 'white' }}>
                    Cancel
                  </button>
                </div>
              </div>

              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#333' }}>All Customers ({customers.length})</h3>
                  <button onClick={clearAllCustomers} style={{ ...buttonStyle, background: '#f44336', color: 'white', fontSize: '12px', padding: '6px 16px' }}>
                    Clear All
                  </button>
                </div>
                {loadingCustomers ? (
                  <p>Loading...</p>
                ) : customers.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '14px' }}>No customers found. Create one using the form above.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Latitude</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Longitude</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>POP</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Details</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer) => (
                          <tr key={customer._id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px' }}>{customer.customer_name}</td>
                            <td style={{ padding: '12px' }}>{customer.latitude?.toFixed(6) || '-'}</td>
                            <td style={{ padding: '12px' }}>{customer.longitude?.toFixed(6) || '-'}</td>
                            <td style={{ padding: '12px' }}>{customer.pop_id?.name || '-'}</td>
                            <td style={{ padding: '12px' }}>{customer.details || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button onClick={() => editCustomer(customer)} style={{ ...buttonStyle, background: '#2196f3', color: 'white', fontSize: '11px', padding: '4px 10px' }}>
                                  Edit
                                </button>
                                <button onClick={() => deleteCustomer(customer._id)} style={{ ...buttonStyle, background: '#f44336', color: 'white', fontSize: '11px', padding: '4px 10px' }}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
