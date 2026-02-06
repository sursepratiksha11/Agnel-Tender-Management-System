import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import { tenderService } from '../../services/bidder/tenderService';
import { proposalService } from '../../services/bidder/proposalService';
import { aiService } from '../../services/bidder/aiService';

export default function PdfAnalyze() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const tenderId = query.get('tenderId');
  const proposalId = query.get('proposalId');

  const [tender, setTender] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sectionDrafts, setSectionDrafts] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        if (tenderId) {
          const tRes = await tenderService.getTenderFullDetails(tenderId);
          setTender(tRes.data?.data?.tender || tRes.data?.tender || null);
        }
        if (proposalId) {
          const pRes = await proposalService.getProposalByTenderId(proposalId).catch(() => null);
          setProposal(pRes?.data?.data?.proposal || pRes?.data?.proposal || null);

          // try to load current collaborators/suggestions from backend
          try {
            const cRes = await proposalService.getCollaborators(proposalId);
            setCollaborators(cRes.data?.collaborators || cRes.data || []);
          } catch (err) {
            // ignore if endpoint not available
          }
          try {
            const sRes = await proposalService.getSuggestions(proposalId);
            setSuggestions(sRes.data?.suggestions || sRes.data || []);
          } catch (err) {
            // ignore if endpoint not available
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, [tenderId, proposalId]);

  // Upload handler
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setPdfFile(f);
  };

  // Call server PDF analyze endpoint (server should use GROQ API key)
  const handleAnalyze = async () => {
    if (!pdfFile) return alert('Select a PDF file first.');
    setAnalysisLoading(true);
    setAnalysisResult(null);
    try {
      const fd = new FormData();
      fd.append('file', pdfFile);
      fd.append('tenderId', tenderId || '');
      fd.append('proposalId', proposalId || '');

      // Use direct fetch so server-side can use GROQ key
      const res = await fetch('/api/pdf/analyze', {
        method: 'POST',
        body: fd
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Analyze failed');
      }
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Analyze error', err);
      alert('PDF analysis failed: ' + (err.message || 'unknown'));
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Invite collaborator (backend expected to send invite or create collaborator record)
  const handleInvite = async () => {
    if (!inviteEmail || !proposalId) return;
    try {
      const res = await proposalService.inviteCollaborator(proposalId, { email: inviteEmail });
      setCollaborators(prev => [...prev, res.data?.collaborator || { email: inviteEmail }]);
      setInviteEmail('');
      alert('Invite sent (if backend supports it).');
    } catch (err) {
      console.error('Invite failed', err);
      alert('Invite failed. Ensure backend endpoint exists.');
    }
  };

  // Submit suggestion (collaborator mode)
  const handleSubmitSuggestion = async (sectionId) => {
    const content = sectionDrafts[sectionId] || '';
    if (!content.trim() || !proposalId) return alert('Enter suggestion content.');
    try {
      const res = await proposalService.submitSuggestion(proposalId, { sectionId, content, author: 'collaborator' });
      setSuggestions(prev => [...prev, res.data?.suggestion || { sectionId, content, author: 'collaborator' }]);
      setSectionDrafts(prev => ({ ...prev, [sectionId]: '' }));
      alert('Suggestion submitted.');
    } catch (err) {
      console.error('Submit suggestion failed', err);
      alert('Failed to submit suggestion. Ensure backend endpoint exists.');
    }
  };

  // Bidder applies suggestion -> mark as "applied" and update proposal section for preview
  const handleApplySuggestion = async (suggestion) => {
    if (!proposalId) return;
    if (!confirm('Apply this suggestion to the proposal section for bidder preview?')) return;
    try {
      // call backend to apply suggestion if endpoint exists
      await proposalService.applySuggestion(proposalId, suggestion.id || suggestion._id || suggestion.suggestionId);
      // update section content on server
      await proposalService.updateProposalSection(proposalId, suggestion.sectionId, suggestion.content);
      // refresh suggestions list
      const sRes = await proposalService.getSuggestions(proposalId);
      setSuggestions(sRes.data?.suggestions || sRes.data || []);
      alert('Suggestion applied. Preview available to bidder.');
    } catch (err) {
      console.error('Apply failed', err);
      alert('Apply failed. Ensure backend endpoints exist.');
    }
  };

  return (
    <BidderLayout>
      <div className="min-h-screen p-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">PDF Analyze & Collaboration</h1>
            <div className="flex gap-2">
              <button onClick={() => navigate(-1)} className="px-3 py-2 rounded bg-white border">Back</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="bg-white p-4 rounded border">
                <h2 className="font-medium mb-2">AI PDF Analysis</h2>
                <input type="file" accept="application/pdf" onChange={handleFileChange} />
                <div className="mt-3 flex gap-2">
                  <button onClick={handleAnalyze} disabled={analysisLoading} className="px-3 py-2 bg-primary-600 text-white rounded">
                    {analysisLoading ? 'Analyzing...' : 'Run Analysis'}
                  </button>
                  <button onClick={() => { setAnalysisResult(null); setPdfFile(null); }} className="px-3 py-2 border rounded">Reset</button>
                </div>
                {analysisResult && (
                  <div className="mt-4">
                    <h3 className="font-semibold">Analysis Result</h3>
                    <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-3 rounded mt-2">{JSON.stringify(analysisResult, null, 2)}</pre>
                  </div>
                )}
              </section>

              <section className="bg-white p-4 rounded border">
                <h2 className="font-medium mb-2">Sections & Suggestions</h2>
                {proposal?.sections?.length ? (
                  proposal.sections.map(sec => (
                    <div key={sec.section_id || sec._id || sec.id} className="mb-3 border p-3 rounded">
                      <div className="font-semibold">{sec.title || sec.name}</div>
                      <div className="text-sm text-slate-600 mb-2">{(sec.content || sec.description || '').substring(0, 200)}...</div>

                      <textarea
                        placeholder="Draft suggestion or edited content..."
                        value={sectionDrafts[sec.section_id || sec._id || sec.id] || ''}
                        onChange={(e) => setSectionDrafts(prev => ({ ...prev, [sec.section_id || sec._id || sec.id]: e.target.value }))}
                        className="w-full border p-2 rounded mb-2"
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSubmitSuggestion(sec.section_id || sec._id || sec.id)} className="px-3 py-1 bg-blue-600 text-white rounded">Submit Suggestion</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No proposal sections loaded.</p>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <section className="bg-white p-4 rounded border">
                <h3 className="font-medium mb-2">Collaborators</h3>
                <div className="flex gap-2 mb-2">
                  <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" className="flex-1 border p-2 rounded" />
                  <button onClick={handleInvite} className="px-3 py-2 bg-green-600 text-white rounded">Invite</button>
                </div>
                <ul className="text-sm">
                  {collaborators.length ? collaborators.map((c, i) => (
                    <li key={i} className="py-1 border-b last:border-b-0">{c.email || c.user_email || c}</li>
                  )) : <li className="text-slate-500">No collaborators yet.</li>}
                </ul>
              </section>

              <section className="bg-white p-4 rounded border">
                <h3 className="font-medium mb-2">Suggestions</h3>
                {suggestions.length ? suggestions.map(s => (
                  <div key={s.id || s._id || `${s.sectionId}-${s.author}`} className="mb-3">
                    <div className="text-sm font-medium">{s.sectionTitle || s.sectionId}</div>
                    <div className="text-xs text-slate-500 mb-1">By: {s.author || 'collaborator'}</div>
                    <div className="text-sm mb-2 whitespace-pre-wrap bg-slate-50 p-2 rounded">{s.content}</div>
                    {proposal && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApplySuggestion(s)} className="px-2 py-1 bg-primary-600 text-white rounded text-sm">Apply</button>
                      </div>
                    )}
                  </div>
                )) : <p className="text-slate-500 text-sm">No suggestions yet.</p>}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </BidderLayout>
  );
}
