import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Calendar, LogIn, LogOut, Plus } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Badge, Modal, Input } from '../../components/ui';

interface AttendanceRecord {
  id: number;
  assignment: number;
  resource_name: string;
  project_code: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_location: string;
  check_out_location: string;
  check_in_lat: string | null;
  check_in_lng: string | null;
  check_out_lat: string | null;
  check_out_lng: string | null;
  interviews_conducted: number;
  villages_visited: string;
  travel_distance_km: string | null;
  notes: string;
}

const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  
  const [checkInForm, setCheckInForm] = useState({
    assignment_id: '',
    location: '',
    lat: '',
    lng: '',
  });

  const [checkOutForm, setCheckOutForm] = useState({
    assignment_id: '',
    location: '',
    lat: '',
    lng: '',
    interviews_conducted: '',
    villages_visited: '',
    notes: '',
  });

  const [manualForm, setManualForm] = useState({
    assignment: '',
    date: '',
    check_in_time: '',
    check_out_time: '',
    check_in_location: '',
    check_out_location: '',
    check_in_lat: '',
    check_in_lng: '',
    check_out_lat: '',
    check_out_lng: '',
    interviews_conducted: '',
    villages_visited: '',
    travel_distance_km: '',
    notes: '',
  });

  useEffect(() => {
    loadRecords();
    checkTodayStatus();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await api.get<{ results: AttendanceRecord[] }>(endpoints.attendance);
      setRecords(data.results || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
    setLoading(false);
  };

  const checkTodayStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await api.get<{ results: AttendanceRecord[] }>(`${endpoints.attendance}?date=${today}`);
      if (data.results && data.results.length > 0) {
        setTodayRecord(data.results[0]);
      }
    } catch (error) {
      console.error('Error checking today status:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await api.post(`${endpoints.attendance}check_in/`, checkInForm);
      setShowCheckInModal(false);
      setCheckInForm({ assignment_id: '', location: '', lat: '', lng: '' });
      loadRecords();
      checkTodayStatus();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post(`${endpoints.attendance}check_out/`, checkOutForm);
      setShowCheckOutModal(false);
      setCheckOutForm({ assignment_id: '', location: '', lat: '', lng: '', interviews_conducted: '', villages_visited: '', notes: '' });
      loadRecords();
      checkTodayStatus();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Check-out failed');
    }
  };

  const handleManualEntry = async () => {
    try {
      await api.post(endpoints.attendance, {
        ...manualForm,
        assignment: parseInt(manualForm.assignment),
        interviews_conducted: parseInt(manualForm.interviews_conducted) || 0,
      });
      setShowManualModal(false);
      setManualForm({
        assignment: '', date: '', check_in_time: '', check_out_time: '',
        check_in_location: '', check_out_location: '', check_in_lat: '', check_in_lng: '',
        check_out_lat: '', check_out_lng: '', interviews_conducted: '',
        villages_visited: '', travel_distance_km: '', notes: '',
      });
      loadRecords();
    } catch (error) {
      alert('Failed to create attendance record');
    }
  };

  const getCurrentLocation = (callback: (lat: string, lng: string) => void) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => callback(position.coords.latitude.toString(), position.coords.longitude.toString()),
        () => alert('Unable to get location')
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowManualModal(true)}>
            <Plus className="w-4 h-4" /> Manual Entry
          </Button>
          {!todayRecord && (
            <Button onClick={() => setShowCheckInModal(true)}>
              <LogIn className="w-4 h-4" /> Check In
            </Button>
          )}
          {todayRecord && !todayRecord.check_out_time && (
            <Button variant="secondary" onClick={() => setShowCheckOutModal(true)}>
              <LogOut className="w-4 h-4" /> Check Out
            </Button>
          )}
        </div>
      </div>

      {todayRecord && (
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-emerald-900">Today's Status</p>
              <p className="text-sm text-emerald-700">
                Checked in at {todayRecord.check_in_time} • {todayRecord.check_in_location}
              </p>
            </div>
            {todayRecord.check_out_time ? (
              <Badge variant="success">Checked Out</Badge>
            ) : (
              <Badge variant="warning">Active</Badge>
            )}
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Resource</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Project</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Check In</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Check Out</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Interviews</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Villages</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {record.date}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium">{record.resource_name}</td>
                    <td className="px-4 py-4">{record.project_code}</td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {record.check_in_time}
                        </div>
                        <div className="text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {record.check_in_location}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {record.check_out_time ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {record.check_out_time}
                          </div>
                          <div className="text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {record.check_out_location}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="warning">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center font-semibold">{record.interviews_conducted}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{record.villages_visited || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Check In Modal */}
      <Modal isOpen={showCheckInModal} onClose={() => setShowCheckInModal(false)} title="Check In">
        <div className="space-y-4">
          <Input
            label="Assignment ID"
            value={checkInForm.assignment_id}
            onChange={(e) => setCheckInForm({ ...checkInForm, assignment_id: e.target.value })}
            required
          />
          <Input
            label="Location"
            value={checkInForm.location}
            onChange={(e) => setCheckInForm({ ...checkInForm, location: e.target.value })}
            placeholder="e.g., Madhubani Block Office"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              value={checkInForm.lat}
              onChange={(e) => setCheckInForm({ ...checkInForm, lat: e.target.value })}
            />
            <Input
              label="Longitude"
              value={checkInForm.lng}
              onChange={(e) => setCheckInForm({ ...checkInForm, lng: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => getCurrentLocation((lat, lng) => setCheckInForm({ ...checkInForm, lat, lng }))}
          >
            <MapPin className="w-4 h-4" /> Use Current Location
          </Button>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowCheckInModal(false)}>Cancel</Button>
            <Button onClick={handleCheckIn}>Check In</Button>
          </div>
        </div>
      </Modal>

      {/* Check Out Modal */}
      <Modal isOpen={showCheckOutModal} onClose={() => setShowCheckOutModal(false)} title="Check Out">
        <div className="space-y-4">
          <Input
            label="Assignment ID"
            value={checkOutForm.assignment_id}
            onChange={(e) => setCheckOutForm({ ...checkOutForm, assignment_id: e.target.value })}
            required
          />
          <Input
            label="Location"
            value={checkOutForm.location}
            onChange={(e) => setCheckOutForm({ ...checkOutForm, location: e.target.value })}
            placeholder="e.g., Rampur Village"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              value={checkOutForm.lat}
              onChange={(e) => setCheckOutForm({ ...checkOutForm, lat: e.target.value })}
            />
            <Input
              label="Longitude"
              value={checkOutForm.lng}
              onChange={(e) => setCheckOutForm({ ...checkOutForm, lng: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => getCurrentLocation((lat, lng) => setCheckOutForm({ ...checkOutForm, lat, lng }))}
          >
            <MapPin className="w-4 h-4" /> Use Current Location
          </Button>
          <Input
            label="Interviews Conducted"
            type="number"
            value={checkOutForm.interviews_conducted}
            onChange={(e) => setCheckOutForm({ ...checkOutForm, interviews_conducted: e.target.value })}
          />
          <Input
            label="Villages Visited"
            value={checkOutForm.villages_visited}
            onChange={(e) => setCheckOutForm({ ...checkOutForm, villages_visited: e.target.value })}
            placeholder="e.g., Rampur, Sitapur"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={checkOutForm.notes}
              onChange={(e) => setCheckOutForm({ ...checkOutForm, notes: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowCheckOutModal(false)}>Cancel</Button>
            <Button onClick={handleCheckOut}>Check Out</Button>
          </div>
        </div>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal isOpen={showManualModal} onClose={() => setShowManualModal(false)} title="Manual Attendance Entry" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Assignment ID"
            value={manualForm.assignment}
            onChange={(e) => setManualForm({ ...manualForm, assignment: e.target.value })}
            required
          />
          <Input
            label="Date"
            type="date"
            value={manualForm.date}
            onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
            required
          />
          <Input
            label="Check In Time"
            type="time"
            value={manualForm.check_in_time}
            onChange={(e) => setManualForm({ ...manualForm, check_in_time: e.target.value })}
          />
          <Input
            label="Check Out Time"
            type="time"
            value={manualForm.check_out_time}
            onChange={(e) => setManualForm({ ...manualForm, check_out_time: e.target.value })}
          />
          <Input
            label="Check In Location"
            value={manualForm.check_in_location}
            onChange={(e) => setManualForm({ ...manualForm, check_in_location: e.target.value })}
          />
          <Input
            label="Check Out Location"
            value={manualForm.check_out_location}
            onChange={(e) => setManualForm({ ...manualForm, check_out_location: e.target.value })}
          />
          <Input
            label="Interviews Conducted"
            type="number"
            value={manualForm.interviews_conducted}
            onChange={(e) => setManualForm({ ...manualForm, interviews_conducted: e.target.value })}
          />
          <Input
            label="Villages Visited"
            value={manualForm.villages_visited}
            onChange={(e) => setManualForm({ ...manualForm, villages_visited: e.target.value })}
          />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={manualForm.notes}
              onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button variant="secondary" onClick={() => setShowManualModal(false)}>Cancel</Button>
          <Button onClick={handleManualEntry}>Create Record</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
