import re

with open('frontend/components/tools/ElterngeldOptimizer.tsx', 'r') as f:
    text = f.read()

# 1. Imports
imports = """import React from 'react';
import CardSection from '@/components/ui/CardSection';
import ModernCheckbox from '@/components/ui/ModernCheckbox';
import NumberInput from '@/components/ui/NumberInput';
import { useTranslation } from '@/components/i18n/LanguageProvider';
import type { TaxYear } from '@/lib/local/germanTax';
import SavedScenarios from './elterngeld/SavedScenarios';
import { useElterngeldState, EXAMPLE } from './elterngeld/useElterngeldState';
import { useElterngeldModel } from './elterngeld/useElterngeldModel';
import { ElterngeldResults } from './elterngeld/ElterngeldResults';"""

# replace everything before "const labelStyle" with imports
text = re.sub(r'import React.*?/\*\*\n \* Every figure is computed.*?\*/\n\n' , imports + '\n\n', text, flags=re.DOTALL)
text = re.sub(r'const EXAMPLE = \{.*?\n\};\n\n/\*\*.*?\*/\nconst valueOr = .*?;\n\n', '', text, flags=re.DOTALL)

# 2. Component state
state_code = """export const ElterngeldOptimizer: React.FC = () => {
  const { t } = useTranslation();
  const { snapshot, applySnapshot, loadExample, updateField } = useElterngeldState();
  const model = useElterngeldModel(snapshot, t);"""

text = re.sub(r'export const ElterngeldOptimizer: React\.FC = \(\) => \{.*?(?=  return \()', state_code + '\n\n', text, flags=re.DOTALL)

# 3. Component props replacements
# value={baseYear} -> value={snapshot.baseYear}
fields = [
    'filing', 'profitDeltaKind', 'baseYear', 'leaveYear', 'profitLow', 'profitHigh', 'employmentGross', 'relief',
    'prepaidBase', 'prepaidLeave', 'partnerBase', 'partnerLeave', 'ownLeave',
    'pflichtKV', 'pflichtRV', 'pflichtAV', 'childless', 'children', 'maternityEnabled',
    'weeksBefore', 'weeksAfter', 'extraContribution', 'basisMonths', 'plusMonths', 'duringLeave', 'multiples', 'siblingBonus'
]

for field in fields:
    # value={field}
    text = re.sub(r'value=\{'+field+r'\}', f'value={{snapshot.{field}}}', text)
    # checked={field}
    text = re.sub(r'checked=\{'+field+r'\}', f'checked={{snapshot.{field}}}', text)
    # onChange={setXxx}
    set_name = 'set' + field[0].upper() + field[1:]
    text = re.sub(r'onChange=\{'+set_name+r'\}', f"onChange={{(v) => updateField('{field}', v)}}", text)
    # onChange={(e) => setXxx(Number(e.target.value) as TaxYear)}
    text = re.sub(r'onChange=\{\(e\) => '+set_name+r'\(Number\(e\.target\.value\) as TaxYear\)\}', f"onChange={{(e) => updateField('{field}', Number(e.target.value) as TaxYear)}}", text)

# 4. Results
results_code = """        {/* ── Results ── */}
        <div className="space-y-6 xl:col-span-2">
          <ElterngeldResults model={model} profitDeltaKind={snapshot.profitDeltaKind} relief={snapshot.relief} />
        </div>
      </div>"""
text = re.sub(r'        \{/\* ── Results ── \*/\}.*?      </div>', results_code, text, flags=re.DOTALL)

with open('frontend/components/tools/ElterngeldOptimizer.tsx.new', 'w') as f:
    f.write(text)
