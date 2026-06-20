import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { decisionSignalsApi } from '../../api/decisionSignals';
import { getParsedApiError, type ParsedApiError } from '../../api/error';
import { ApiErrorAlert, Card, Drawer, EmptyState } from '../common';
import {
  DecisionSignalCard,
  DecisionSignalDetails,
} from '../decision-signals/DecisionSignalDisplay';
import { useUiLanguage } from '../../contexts/UiLanguageContext';
import type { ReportType } from '../../types/analysis';
import type {
  DecisionSignalFeedbackItem,
  DecisionSignalItem,
  DecisionSignalOutcomeItem,
} from '../../types/decisionSignals';

interface ReportDecisionSignalsProps {
  recordId?: number;
  reportType?: ReportType;
}

export const ReportDecisionSignals: React.FC<ReportDecisionSignalsProps> = ({
  recordId,
  reportType,
}) => {
  const { t } = useUiLanguage();
  const [items, setItems] = useState<DecisionSignalItem[]>([]);
  const [selected, setSelected] = useState<DecisionSignalItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [selectedOutcomes, setSelectedOutcomes] = useState<DecisionSignalOutcomeItem[]>([]);
  const [selectedOutcomesLoading, setSelectedOutcomesLoading] = useState(false);
  const [selectedOutcomesError, setSelectedOutcomesError] = useState<ParsedApiError | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<DecisionSignalFeedbackItem | null>(null);
  const [selectedFeedbackLoading, setSelectedFeedbackLoading] = useState(false);
  const [selectedFeedbackError, setSelectedFeedbackError] = useState<ParsedApiError | null>(null);
  const requestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const shouldRender = Boolean(recordId) && reportType !== 'market_review';

  const loadSignals = useCallback(async () => {
    if (!recordId || reportType === 'market_review') return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setItems([]);
    setSelected(null);
    setSelectedOutcomes([]);
    setSelectedOutcomesLoading(false);
    setSelectedOutcomesError(null);
    setSelectedFeedback(null);
    setSelectedFeedbackLoading(false);
    setSelectedFeedbackError(null);
    setError(null);
    try {
      const response = await decisionSignalsApi.list({
        sourceReportId: recordId,
        sourceType: 'analysis',
        page: 1,
        pageSize: 20,
      });
      if (requestIdRef.current !== requestId) return;
      setItems(response.items);
      setError(null);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(getParsedApiError(err));
      setItems([]);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [recordId, reportType]);

  useEffect(() => {
    if (!shouldRender) {
      requestIdRef.current += 1;
      setLoading(false);
      setItems([]);
      setSelected(null);
      setSelectedOutcomes([]);
      setSelectedOutcomesLoading(false);
      setSelectedOutcomesError(null);
      setSelectedFeedback(null);
      setSelectedFeedbackLoading(false);
      setSelectedFeedbackError(null);
      setError(null);
      return;
    }
    void loadSignals();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadSignals, shouldRender]);

  useEffect(() => {
    if (!selected) {
      detailRequestIdRef.current += 1;
      setSelectedOutcomes([]);
      setSelectedOutcomesLoading(false);
      setSelectedOutcomesError(null);
      setSelectedFeedback(null);
      setSelectedFeedbackLoading(false);
      setSelectedFeedbackError(null);
      return;
    }

    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setSelectedOutcomesLoading(true);
    setSelectedFeedbackLoading(true);
    setSelectedOutcomesError(null);
    setSelectedFeedbackError(null);

    void decisionSignalsApi.getSignalOutcomes(selected.id)
      .then((response) => {
        if (detailRequestIdRef.current !== requestId) return;
        setSelectedOutcomes(response.items);
      })
      .catch((err) => {
        if (detailRequestIdRef.current !== requestId) return;
        setSelectedOutcomes([]);
        setSelectedOutcomesError(getParsedApiError(err));
      })
      .finally(() => {
        if (detailRequestIdRef.current === requestId) {
          setSelectedOutcomesLoading(false);
        }
      });

    void decisionSignalsApi.getFeedback(selected.id)
      .then((response) => {
        if (detailRequestIdRef.current !== requestId) return;
        setSelectedFeedback(response);
      })
      .catch((err) => {
        if (detailRequestIdRef.current !== requestId) return;
        setSelectedFeedback(null);
        setSelectedFeedbackError(getParsedApiError(err));
      })
      .finally(() => {
        if (detailRequestIdRef.current === requestId) {
          setSelectedFeedbackLoading(false);
        }
      });
  }, [selected]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <Card
        title={t('decisionSignals.reportSectionTitle')}
        subtitle={t('decisionSignals.reportSectionDescription')}
        padding="md"
      >
        {error ? (
          <ApiErrorAlert
            error={{ ...error, title: t('decisionSignals.reportErrorTitle') }}
            actionLabel={t('common.retry')}
            onAction={() => void loadSignals()}
          />
        ) : null}
        {loading && items.length === 0 ? (
          <div className="grid gap-3">
            <div className="h-24 animate-pulse rounded-2xl border border-border/70 bg-card/60" />
            <div className="h-24 animate-pulse rounded-2xl border border-border/70 bg-card/60" />
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <EmptyState
            className="border-none bg-transparent py-6 shadow-none"
            title={t('decisionSignals.reportEmptyTitle')}
            description={t('decisionSignals.reportEmptyDescription')}
            icon={<Activity className="h-6 w-6" />}
          />
        ) : null}
        {items.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <DecisionSignalCard
                key={item.id}
                item={item}
                onSelect={(selectedItem) => setSelected(selectedItem)}
                selected={selected?.id === item.id}
              />
            ))}
          </div>
        ) : null}
      </Card>

      <Drawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={t('decisionSignals.detailTitle')}
        width="max-w-3xl"
      >
        {selected ? (
          <DecisionSignalDetails
            item={selected}
            outcomes={selectedOutcomes}
            outcomesLoading={selectedOutcomesLoading}
            outcomesError={selectedOutcomesError?.message ?? null}
            feedback={selectedFeedback}
            feedbackLoading={selectedFeedbackLoading}
            feedbackError={selectedFeedbackError?.message ?? null}
          />
        ) : null}
      </Drawer>
    </>
  );
};
