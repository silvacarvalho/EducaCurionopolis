import React, { useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import TurmasTab from '../components/turmas/TurmasTab';
import AlunosTab from '../components/turmas/AlunosTab';
import DisciplinasTab from '../components/turmas/DisciplinasTab';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TurmasAlunosPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedTurma, setSelectedTurma] = useState<{ id: number; escola_id: number } | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTurmaSelect = (turma: { id: number; escola_id: number }) => {
    setSelectedTurma(turma);
  };

  return (
    <Box>
      <AppBarWithUserMenu title="Gerenciamento de Turmas e Alunos" showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Turmas" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Disciplinas" id="tab-1" aria-controls="tabpanel-1" />
            <Tab label="Alunos" id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <TurmasTab onTurmaSelect={handleTurmaSelect} />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {selectedTurma ? (
              <DisciplinasTab turmaId={selectedTurma.id} escolaId={selectedTurma.escola_id} />
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                Selecione uma turma na aba "Turmas" para gerenciar suas disciplinas
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <AlunosTab />
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default TurmasAlunosPage;
