import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, SlidersHorizontal, MapPin } from 'lucide-react';
import './BinRegistry.css';

const DUMMY_BINS_REGISTRY = [
  { id: 'BIN-023', location: 'Koramangala Block 5', zone: 'Koramangala North', fill: 95, wasteType: 'Mixed', status: 'Full', lastCol: '2 days ago', nextCol: 'Today', battery: 8 },
  { id: 'BIN-088', location: '100ft Road', zone: 'Indiranagar', fill: 72, wasteType: 'Recyclable', status: 'Near Full', lastCol: 'Yesterday', nextCol: 'Tomorrow', battery: 45 },
  { id: 'BIN-041', location: 'ITPB Main Gate', zone: 'Whitefield', fill: 30, wasteType: 'Hazardous', status: 'Online', lastCol: 'Today', nextCol: 'In 3 days', battery: 92 },
  { id: 'BIN-102', location: '4th Block Complex', zone: 'Jayanagar', fill: 88, wasteType: 'Organic', status: 'Full', lastCol: '2 days ago', nextCol: 'Today', battery: 60 },
  { id: 'BIN-015', location: 'Silk Board Junction', zone: 'HSR Layout', fill: 50, wasteType: 'Mixed', status: 'Online', lastCol: 'Yesterday', nextCol: 'In 2 days', battery: 85 },
  { id: 'BIN-099', location: 'Malleswaram 18th Cross', zone: 'Malleswaram', fill: 100, wasteType: 'Organic', status: 'Fault', lastCol: '3 days ago', nextCol: 'Pending', battery: 0 },
  { id: 'BIN-007', location: 'Brigade Road', zone: 'CBD Area', fill: 45, wasteType: 'Recyclable', status: 'Offline', lastCol: 'Today', nextCol: 'Tomorrow', battery: 5 },
  { id: 'BIN-064', location: 'BTM Water Tank', zone: 'BTM Layout', fill: 62, wasteType: 'Mixed', status: 'Near Full', lastCol: 'Today', nextCol: 'Tomorrow', battery: 78 },
  { id: 'BIN-033', location: 'Manyata Tech Park', zone: 'Hebbal', fill: 91, wasteType: 'Organic', status: 'Full', lastCol: 'Yesterday', nextCol: 'Today', battery: 18 },
  { id: 'BIN-112', location: 'Forum Mall', zone: 'Koramangala South', fill: 82, wasteType: 'Mixed', status: 'Near Full', lastCol: 'Today', nextCol: 'Tomorrow', battery: 22 },
  { id: 'BIN-029', location: 'Commercial Street', zone: 'Shivajinagar', fill: 15, wasteType: 'Hazardous', status: 'Online', lastCol: 'Today', nextCol: 'In 4 days', battery: 95 },
  { id: 'BIN-055', location: 'Domlur Layout', zone: 'Indiranagar', fill: 55, wasteType: 'Recyclable', status: 'Collecting', lastCol: '2 hrs ago', nextCol: 'In 2 days', battery: 88 },
  { id: 'BIN-081', location: 'Electronic City Phase 1', zone: 'Electronic City', fill: 98, wasteType: 'Mixed', status: 'Full', lastCol: '3 days ago', nextCol: 'Immediate', battery: 42 },
  { id: 'BIN-047', location: 'JP Nagar Phase 3', zone: 'JP Nagar', fill: 75, wasteType: 'Organic', status: 'Near Full', lastCol: 'Yesterday', nextCol: 'Tomorrow', battery: 65 },
  { id: 'BIN-010', location: 'MG Road Metro', zone: 'CBD Area', fill: 35, wasteType: 'Mixed', status: 'Online', lastCol: 'Today', nextCol: 'In 3 days', battery: 70 }
];

const BinRegistry = () => {
  const [bins, setBins] = useState(DUMMY_BINS_REGISTRY);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter & Search Logic
  const filteredBins = useMemo(() => {
    return bins.filter((bin) => {
      const matchesSearch = 
        bin.id.toLowerCase().includes(search.toLowerCase()) || 
        bin.location.toLowerCase().includes(search.toLowerCase()) || 
        bin.zone.toLowerCase().includes(search.toLowerCase());
      
      const matchesFilter = filterStatus === 'All' || bin.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [bins, search, filterStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredBins.length / itemsPerPage);
  const paginatedBins = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBins.slice(start, start + itemsPerPage);
  }, [filteredBins, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset page on filter/search
  }, [search, filterStatus]);

  // UI Helpers
  const getFillColor = (fill) => {
    if (fill >= 85) return 'fill-red';
    if (fill >= 60) return 'fill-yellow';
    return 'fill-blue';
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Full': return 'badge-red';
      case 'Near Full': return 'badge-yellow';
      case 'Online': return 'badge-green';
      case 'Fault': return 'badge-orange';
      case 'Offline': return 'badge-gray';
      case 'Collecting': return 'badge-blue';
      default: return 'badge-gray';
    }
  };

  const getBatteryColor = (level) => {
    if (level > 50) return 'batt-green';
    if (level >= 20) return 'batt-yellow';
    return 'batt-red';
  };

  return (
    <div className="registry-container">
      <div className="registry-header-area">
        <div className="r-left">
          <h2>Bin Status Registry</h2>
          <p>{filteredBins.length} bins • Updated {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
        <div className="r-right">
          <div className="r-searchbox">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search bins, zones..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="r-filterbox">
            <SlidersHorizontal size={18} className="filter-icon" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Online">Online</option>
              <option value="Near Full">Near Full</option>
              <option value="Full">Full</option>
              <option value="Collecting">Collecting</option>
              <option value="Fault">Fault</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      <div className="registry-table-wrapper">
        <table className="registry-table">
          <thead>
            <tr>
              <th width="40"><input type="checkbox" /></th>
              <th>Bin ID</th>
              <th>Location / Zone</th>
              <th width="150">Fill Level</th>
              <th>Waste Type</th>
              <th>Status</th>
              <th>Last Collection</th>
              <th>Next Collection</th>
              <th width="120">Battery</th>
              <th width="80">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBins.length === 0 ? (
              <tr>
                <td colSpan="10" className="r-empty">No bins match your search criteria.</td>
              </tr>
            ) : (
              paginatedBins.map((bin) => (
                <tr key={bin.id} className="r-row">
                  <td><input type="checkbox" /></td>
                  <td className="r-id">{bin.id}</td>
                  <td className="r-location">
                    <span className="loc-name">{bin.location}</span>
                    <span className="loc-zone"><MapPin size={10}/> {bin.zone}</span>
                  </td>
                  <td className="r-fill">
                    <div className="r-fill-label">
                      <span>{bin.fill}%</span>
                    </div>
                    <div className="r-fill-bar-bg">
                      <div className={`r-fill-bar ${getFillColor(bin.fill)}`} style={{ width: `${bin.fill}%` }}></div>
                    </div>
                  </td>
                  <td><span className="r-waste-type">{bin.wasteType}</span></td>
                  <td><span className={`r-status-badge ${getStatusClass(bin.status)}`}>{bin.status}</span></td>
                  <td className="r-text-muted">{bin.lastCol}</td>
                  <td className="r-text-dark">{bin.nextCol}</td>
                  <td className="r-battery">
                    <div className="r-batt-label">{bin.battery}%</div>
                    <div className="r-batt-bg">
                      <div className={`r-batt-bar ${getBatteryColor(bin.battery)}`} style={{ width: `${bin.battery}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <button className="r-action-btn">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="registry-pagination">
        <div className="r-page-info">
          Showing {filteredBins.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredBins.length)} of {filteredBins.length} bins
        </div>
        <div className="r-page-controls">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="r-current-page">Page {currentPage} of {totalPages || 1}</span>
          <button 
            disabled={currentPage === totalPages || totalPages === 0} 
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BinRegistry;
