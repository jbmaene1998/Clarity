import React from 'react';
import CategoryList from './CategoryList.jsx';
import SourceList from './SourceList.jsx';
import RecurringSection from './RecurringSection.jsx';
import GoalsSection from './GoalsSection.jsx';

export default function BudgetPage({ addToast }) {
  return (
    <section id="budgetPage">
      <CategoryList addToast={addToast} />
      <SourceList addToast={addToast} />
      <RecurringSection addToast={addToast} />
      <GoalsSection addToast={addToast} />
    </section>
  );
}
