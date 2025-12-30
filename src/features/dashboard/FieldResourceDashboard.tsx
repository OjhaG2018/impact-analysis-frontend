import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { 
  Target, 
  CheckCircle, 
  Clock, 
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Mic,
  Video,
  Users,
  ArrowRight,
  Play,
  AlertCircle,
  TrendingUp,
  ClipboardList,
  Building2,
  Phone,
  Mail,
  Navigation,
  Sun,
  Moon,
  Coffee,
  Award,
  Star,
  ChevronRight,
  Plus,
  Upload,
  MessageSquare,
  Activity
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

// Types
interface Assignment {
  id: number;
  beneficiary_name: string;
  project_name: string;
  status: string;
  scheduled_date?: string;
  location?: string;
  phone?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface AttendanceRecord {
  id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  hours_worked?: number;
}

interface ExpenseClaim {
  id: number;
  date: string;
  amount: number;
  category: string;
  status: string;
}

// Quick Action Card Component
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ 
  title, description, icon: Icon, color, bgColor, onClick, badge 
}) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer group flex items-center gap-4"
  >
    <div className={`p-3 rounded-xl ${bgColor} group-hover:scale-110 transition-transform duration-300`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
  </div>
);

// Assignment Card Component
interface AssignmentCardProps {
  assignment: Assignment;
  onStart: () => void;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onStart }) => {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-green-500 bg-green-50'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    scheduled: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-100 border-l-4 ${priorityColors[assignment.priority || 'medium']} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{assignment.beneficiary_name}</h4>
          <p className="text-sm text-gray-500">{assignment.project_name}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[assignment.status] || 'bg-gray-100 text-gray-700'}`}>
          {assignment.status.replace('_', ' ')}
        </span>
      </div>
      {assignment.location && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{assignment.location}</span>
        </div>
      )}
      {assignment.scheduled_date && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Calendar className="h-3.5 w-3.5" />
          <span>{new Date(assignment.scheduled_date).toLocaleDateString()}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button 
          onClick={onStart}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Play className="h-4 w-4" />
          Start Interview
        </button>
        {assignment.phone && (
          <a 
            href={`tel:${assignment.phone}`}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Phone className="h-4 w-4 text-gray-600" />
          </a>
        )}
      </div>
    </div>
  );
};

const FieldResourceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseClaim[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load dashboard stats
      const data = await api.get<any>(endpoints.dashboardStats);
      setStats(data);

      // Try to load assignments
      try {
        const assignmentsData = await api.get<any>(`${endpoints.beneficiaryAssignments}?status=pending,in_progress`);
        if (assignmentsData?.results) {
          setAssignments(assignmentsData.results.slice(0, 5));
        }
      } catch (e) {
        // Use mock data if API not available
        setAssignments([
          { id: 1, beneficiary_name: 'Rajesh Kumar', project_name: 'Rural Health Survey', status: 'pending', location: 'Village A', priority: 'high' },
          { id: 2, beneficiary_name: 'Priya Sharma', project_name: 'Education Impact', status: 'scheduled', location: 'Block B', priority: 'medium' },
          { id: 3, beneficiary_name: 'Amit Patel', project_name: 'Livelihood Assessment', status: 'in_progress', location: 'Town C', priority: 'low' },
        ]);
      }

      // Generate weekly progress data
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const today = new Date().getDay();
      setWeeklyProgress(days.map((day, idx) => ({
        name: day,
        completed: idx < today ? Math.floor(Math.random() * 5) + 1 : 0,
        target: 4
      })));

    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Sun, color: 'text-amber-500' };
    if (hour < 17) return { text: 'Good Afternoon', icon: Coffee, color: 'text-orange-500' };
    return { text: 'Good Evening', icon: Moon, color: 'text-indigo-500' };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Chart colors
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

  // Stats calculations (mock data for demo)
  const myAssignments = assignments.length || 12;
  const completedToday = 3;
  const pendingAssignments = assignments.filter(a => a.status === 'pending').length || 5;
  const attendanceDays = 22;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Greeting */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <GreetingIcon className={`h-6 w-6 ${greeting.color}`} />
          <span className="text-blue-100">{greeting.text}</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Field Resource Dashboard</h1>
        <p className="text-blue-100">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        {/* Today's Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3">
            <p className="text-blue-100 text-sm">Today's Target</p>
            <p className="text-2xl font-bold">4</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3">
            <p className="text-blue-100 text-sm">Completed</p>
            <p className="text-2xl font-bold">{completedToday}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3">
            <p className="text-blue-100 text-sm">Remaining</p>
            <p className="text-2xl font-bold">{4 - completedToday}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3">
            <p className="text-blue-100 text-sm">This Week</p>
            <p className="text-2xl font-bold">{weeklyProgress.reduce((sum, d) => sum + d.completed, 0)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickActionCard
            title="Mark Attendance"
            description="Check in for today"
            icon={MapPin}
            color="text-green-600"
            bgColor="bg-green-50"
            onClick={() => navigate('/attendance')}
            badge={!todayAttendance ? 'Pending' : undefined}
          />
          <QuickActionCard
            title="My Assignments"
            description={`${pendingAssignments} pending interviews`}
            icon={Target}
            color="text-blue-600"
            bgColor="bg-blue-50"
            onClick={() => navigate('/my-assignments')}
            badge={pendingAssignments > 0 ? `${pendingAssignments}` : undefined}
          />
          <QuickActionCard
            title="Submit Expense"
            description="Claim travel or field expenses"
            icon={DollarSign}
            color="text-amber-600"
            bgColor="bg-amber-50"
            onClick={() => navigate('/expenses')}
          />
          <QuickActionCard
            title="AI Voice Interview"
            description="Start automated interview"
            icon={Mic}
            color="text-purple-600"
            bgColor="bg-purple-50"
            onClick={() => navigate('/ai-interviews')}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="My Assignments" 
          value={myAssignments} 
          icon={Target} 
          color="emerald" 
          onClick={() => navigate('/my-assignments')} 
        />
        <StatCard 
          title="Completed" 
          value={stats?.completed_interviews || 8} 
          icon={CheckCircle} 
          color="blue" 
          onClick={() => navigate('/my-assignments')} 
        />
        <StatCard 
          title="Pending" 
          value={pendingAssignments} 
          icon={Clock} 
          color="amber" 
          onClick={() => navigate('/my-assignments')} 
        />
        <StatCard 
          title="Attendance Days" 
          value={attendanceDays} 
          icon={Calendar} 
          color="purple" 
          onClick={() => navigate('/attendance')} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Assignments */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-gray-400" />
                Today's Assignments
              </h3>
              <button 
                onClick={() => navigate('/my-assignments')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            
            {assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <AssignmentCard 
                    key={assignment.id}
                    assignment={assignment}
                    onStart={() => navigate(`/ai-interviews?beneficiary=${assignment.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No assignments for today</p>
                <button 
                  onClick={() => navigate('/my-assignments')}
                  className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View all assignments
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Weekly Progress Chart */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Weekly Progress
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} name="Completed" />
                  <Bar dataKey="target" fill="#E5E7EB" radius={[4, 4, 0, 0]} name="Target" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Performance Stats */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-gray-400" />
              This Month
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Interviews</span>
                </div>
                <span className="font-semibold text-gray-900">24</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">Attendance</span>
                </div>
                <span className="font-semibold text-gray-900">22 days</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Star className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm text-gray-600">Rating</span>
                </div>
                <span className="font-semibold text-gray-900">4.8/5</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-600">Expenses</span>
                </div>
                <span className="font-semibold text-gray-900">₹3,450</span>
              </div>
            </div>
          </Card>

          {/* Quick Tips */}
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Quick Tips
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Mark attendance before starting interviews
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Submit expenses within 7 days
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Use AI interviews for faster data collection
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-400" />
          All Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/my-assignments')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">My Assignments</h3>
                <p className="text-sm text-gray-500">View and manage tasks</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/attendance')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Attendance</h3>
                <p className="text-sm text-gray-500">Check in/out daily</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/expenses')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">Expenses</h3>
                <p className="text-sm text-gray-500">Submit claims</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/ai-interviews')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-xl group-hover:scale-110 transition-transform">
                <Mic className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">AI Interviews</h3>
                <p className="text-sm text-gray-500">Voice-based surveys</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/interviews')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">Interviews</h3>
                <p className="text-sm text-gray-500">View responses</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/beneficiaries')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Beneficiaries</h3>
                <p className="text-sm text-gray-500">View assigned people</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/audio-analysis')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-50 rounded-xl group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">Audio Upload</h3>
                <p className="text-sm text-gray-500">Upload recordings</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/video-analysis/upload')}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-50 rounded-xl group-hover:scale-110 transition-transform">
                <Video className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">Video Upload</h3>
                <p className="text-sm text-gray-500">Upload videos</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Help Section */}
      <Card className="p-5 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Need Help?</h3>
            <p className="text-sm text-gray-600">Contact your supervisor or check the help guide</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Supervisor
            </button>
            <button className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Help Guide
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FieldResourceDashboard;