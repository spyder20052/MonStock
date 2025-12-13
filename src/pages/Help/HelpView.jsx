import React, { useState, useMemo } from 'react';
import {
    BookOpen, Search, Home, ShoppingCart, Package, Users, BarChart2,
    DollarSign, Settings, AlertTriangle, Clock, ChevronRight, ExternalLink,
    CheckCircle, Info, Lightbulb, Zap, Shield, TrendingUp, FileText, Utensils,
    ArrowRight, Star, Award, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS, hasPermission } from '../../utils/permissions';
import { helpContent } from './helpContent';

const HelpView = ({ userProfile, customerManagementEnabled }) => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('introduction');
    const [searchTerm, setSearchTerm] = useState('');

    // Define all sections with permission requirements
    const allSections = [
        { id: 'introduction', icon: BookOpen, title: 'Introduction', color: 'indigo', permission: null },
        { id: 'quickstart', icon: Zap, title: 'Démarrage Rapide', color: 'emerald', permission: null },
        { id: 'dashboard', icon: Home, title: 'Tableau de Bord', color: 'blue', permission: PERMISSIONS.VIEW_DASHBOARD },
        { id: 'pos', icon: ShoppingCart, title: 'Caisse (POS)', color: 'purple', permission: PERMISSIONS.ACCESS_POS },
        { id: 'products', icon: Package, title: 'Produits', color: 'indigo', permission: PERMISSIONS.VIEW_STOCK },
        { id: 'ingredients', icon: Utensils, title: 'Ingrédients', color: 'orange', permission: PERMISSIONS.VIEW_STOCK },
        { id: 'customers', icon: Users, title: 'Clients', color: 'pink', permission: PERMISSIONS.VIEW_CUSTOMERS, requiresCustomerManagement: true },
        { id: 'analytics', icon: BarChart2, title: 'Analyses', color: 'cyan', permission: PERMISSIONS.VIEW_FINANCIAL_ANALYTICS },
        { id: 'finance', icon: DollarSign, title: 'Finance', color: 'green', permission: PERMISSIONS.VIEW_FINANCIAL_ANALYTICS },
        { id: 'team', icon: Shield, title: 'Équipe (Admin)', color: 'red', permission: PERMISSIONS.MANAGE_TEAM },
        { id: 'faq', icon: Info, title: 'FAQ', color: 'slate', permission: null },
    ];

    // Filter sections based on permissions
    const sections = useMemo(() => {
        return allSections.filter(section => {
            if (section.permission && !hasPermission(userProfile, section.permission)) {
                return false;
            }
            if (section.requiresCustomerManagement && !customerManagementEnabled) {
                return false;
            }
            return true;
        });
    }, [userProfile, customerManagementEnabled]);

    // Ensure active section is accessible
    useMemo(() => {
        if (!sections.find(s => s.id === activeSection)) {
            setActiveSection('introduction');
        }
    }, [sections, activeSection]);

    const currentContent = helpContent[activeSection] || helpContent.introduction;

    return (
        <div className="h-full flex flex-col lg:flex-row bg-slate-50">
            {/* Sidebar Navigation - Desktop */}
            <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800">Guide</h2>
                            <p className="text-xs text-slate-500">Documentation</p>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <nav className="p-3">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all text-left ${activeSection === section.id
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <section.icon size={18} />
                            <span className="text-sm">{section.title}</span>
                            {activeSection === section.id && (
                                <ChevronRight size={16} className="ml-auto" />
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Mobile Section Selector */}
            <div className="lg:hidden bg-white border-b border-slate-200 p-4">
                <select
                    value={activeSection}
                    onChange={(e) => setActiveSection(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                >
                    {sections.map(section => (
                        <option key={section.id} value={section.id}>
                            {section.title}
                        </option>
                    ))}
                </select>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-4 lg:p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-2">
                            {currentContent.title}
                        </h1>
                        <p className="text-slate-600 text-lg">{currentContent.subtitle}</p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-6">
                        {currentContent.sections?.map((section, idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 bg-${section.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                        <section.icon className={`text-${section.color}-600`} size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">{section.title}</h3>
                                        <div className="text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.content }} />
                                        {section.content_more && (
                                            <div className="text-slate-600 leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: section.content_more }} />
                                        )}
                                    </div>
                                </div>

                                {/* Items List */}
                                {section.items && (
                                    <ul className="space-y-2 mt-4 ml-16">
                                        {section.items.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-slate-700">
                                                <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm" dangerouslySetInnerHTML={{ __html: item }} />
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Steps */}
                                {section.steps && (
                                    <ol className="space-y-3 mt-4 ml-16">
                                        {section.steps.map((step, i) => (
                                            <li key={i} className="flex items-start gap-3 text-slate-700">
                                                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                                                    {i + 1}
                                                </span>
                                                <span className="text-sm pt-0.5" dangerouslySetInnerHTML={{ __html: step }} />
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                {/* Fields */}
                                {section.fields && (
                                    <div className="mt-4 ml-16 space-y-2">
                                        {section.fields.map((field, i) => (
                                            <div key={i} className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: field }} />
                                        ))}
                                    </div>
                                )}

                                {/* Categories */}
                                {section.categories && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 ml-16">
                                        {section.categories.map((cat, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                                                <span dangerouslySetInnerHTML={{ __html: cat }} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Roles */}
                                {section.roles && (
                                    <div className="space-y-3 mt-4 ml-16">
                                        {section.roles.map((role, i) => (
                                            <div key={i} className="bg-slate-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-slate-800 mb-2">{role.name}</h4>
                                                <ul className="space-y-1">
                                                    {role.permissions.map((perm, j) => (
                                                        <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                                                            <CheckCircle size={14} className="text-emerald-500" />
                                                            <span dangerouslySetInnerHTML={{ __html: perm }} />
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Example */}
                                {section.example && (
                                    <div className="mt-4 ml-16 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <Lightbulb size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-amber-800" dangerouslySetInnerHTML={{ __html: section.example }} />
                                        </div>
                                    </div>
                                )}

                                {/* Tip */}
                                {section.tip && (
                                    <div className="mt-4 ml-16 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: section.tip }} />
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                {section.action && (
                                    <div className="mt-4 ml-16">
                                        <button
                                            onClick={() => navigate(section.action.path)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                        >
                                            {section.action.label}
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HelpView;
