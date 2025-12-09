import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import api, { endpoints } from '../../api';
import { QuestionnaireTemplate, PaginatedResponse } from '../../types';
import { Card, Button, Badge, LoadingSpinner } from '../../components/ui';

const QuestionnairesPage: React.FC = () => {
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionnaireTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.get<PaginatedResponse<QuestionnaireTemplate> | QuestionnaireTemplate[]>(
        endpoints.templates
      );
      setTemplates(Array.isArray(data) ? data : data.results);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
          <p className="text-gray-500 mt-1">Manage survey templates and questions</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <Card 
            key={template.id} 
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedTemplate(template)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-emerald-600" />
              </div>
              {template.is_default && (
                <Badge variant="success">Default</Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.sector_display}</p>
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{template.description}</p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">
                {template.section_count} sections
              </span>
              <span className="text-sm text-gray-500">
                {template.question_count} questions
              </span>
            </div>
          </Card>
        ))}

        {/* Add new template card */}
        <Card className="p-6 border-dashed border-2 hover:border-emerald-300 transition-colors cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 min-h-[200px]">
          <Plus className="w-12 h-12 mb-2" />
          <p className="font-medium">Create New Template</p>
        </Card>
      </div>
    </div>
  );
};

export default QuestionnairesPage;
