"use client";

import Image from "next/image";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";

const localizer = momentLocalizer(moment);

// Definindo as interfaces para melhor tipagem
interface Dieta {
  execution: string;
}

interface Exercise {
  execution: string;
  time?: string;
  distance?: string;
}

interface Event {
  title: string;
  start: Date;
  end: Date;
  dieta?: Dieta;
  excercise?: Exercise;
}

interface WeightEntry {
  date: string;
  weight: number;
}

interface PersonalData {
  name: string;
  age: number;
  height: number;
  gender: string;
  goalWeight: number;
}

interface WeightData {
  personalData: PersonalData;
  weightHistory: WeightEntry[];
}

type DayBackgroundColors = Record<string, string>;

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [dayBackgroundColors, setDayBackgroundColors] = useState<DayBackgroundColors>({});
  const [averageExecutionPercentage, setAverageExecutionPercentage] = useState(0);
  const [dietaPercentage, setDietaPercentage] = useState(0);
  const [excercisePercentage, setExcercisePercentage] = useState(0);
  const [weightData, setWeightData] = useState<WeightData | null>(null);

  useEffect(() => {
    // Carrega os eventos do JSON
    fetch("/events.json")
      .then((response) => response.json())
      .then((data: Omit<Event, 'start' | 'end'>[]) => {
        // Converte strings para objetos Date e formata os eventos
        const formattedEvents = data.map((event:any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        setEvents(formattedEvents);
        updateDayBackgroundColors(formattedEvents);
        calculateExecutionPercentages(formattedEvents);
      })
      .catch((error) => console.error("Erro ao carregar eventos:", error));

    // Carrega os dados de peso do JSON
    fetch("/person.json")
      .then((response) => response.json())
      .then((data: WeightData) => {
        setWeightData(data);
      })
      .catch((error) => console.error("Erro ao carregar dados de peso:", error));
  }, []);

  const updateDayBackgroundColors = (events: Event[]) => {
    const colors: Record<string, { dietaExecuted: boolean; excerciseExecuted: boolean }> = {};

    events.forEach((event) => {
      const day = moment(event.start).format("YYYY-MM-DD");

      // Inicializa o status para cada dia
      if (!colors[day]) {
        colors[day] = { dietaExecuted: false, excerciseExecuted: false };
      }

      // Atualiza o status de dieta e exercício com base no campo execution
      if (event.dieta?.execution === "true") {
        colors[day].dietaExecuted = true;
      }
      if (event.excercise?.execution === "true") {
        colors[day].excerciseExecuted = true;
      }
    });

    // Define as cores de fundo com base nas condições
    const backgroundColors: DayBackgroundColors = {};
    for (const day in colors) {
      if (colors[day].dietaExecuted && colors[day].excerciseExecuted) {
        backgroundColors[day] = "#59c559"; // Ambos executados
      } else if (colors[day].dietaExecuted || colors[day].excerciseExecuted) {
        backgroundColors[day] = "#eded65"; // Apenas um executado
      } else {
        backgroundColors[day] = "#ff5151"; // Nenhum executado
      }
    }
    setDayBackgroundColors(backgroundColors);
  };

  // Calcula a porcentagem de execução para dieta, exercício, e a média geral combinada
  const calculateExecutionPercentages = (events: Event[]) => {
    const daysInMonth = moment(events[0].start).daysInMonth();
    const uniqueDays = new Set(events.map((event) => moment(event.start).format("YYYY-MM-DD")));

    let totalScore = 0;
    let dietaDays = 0;
    let excerciseDays = 0;

    uniqueDays.forEach((day) => {
      const eventsOfDay = events.filter((event) => moment(event.start).format("YYYY-MM-DD") === day);
      const hasDietaExecution = eventsOfDay.some((event) => event.dieta?.execution === "true");
      const hasExcerciseExecution = eventsOfDay.some((event) => event.excercise?.execution === "true");

      // Atualiza contagem para dieta e exercício individualmente
      if (hasDietaExecution) dietaDays++;
      if (hasExcerciseExecution) excerciseDays++;

      // Calcula a pontuação do dia para a média geral combinada
      if (hasDietaExecution && hasExcerciseExecution) {
        totalScore += 100;
      } else if (hasDietaExecution || hasExcerciseExecution) {
        totalScore += 50;
      }
    });

    // Calcula as porcentagens
    setDietaPercentage(Math.round((dietaDays / daysInMonth) * 100));
    setExcercisePercentage(Math.round((excerciseDays / daysInMonth) * 100));
    setAverageExecutionPercentage(Math.round(totalScore / daysInMonth));
  };

  // Define o estilo de fundo para cada dia
  const dayPropGetter = (date: Date) => {
    const day = moment(date).format("YYYY-MM-DD");
    const backgroundColor = dayBackgroundColors[day] || "transparent";
    return {
      style: {
        backgroundColor,
      },
    };
  };

  // Define o estilo do evento para ter fundo transparente e esconder o título
  const eventPropGetter = () => {
    return {
      style: {
        backgroundColor: "transparent",
        border: "none",
        color: "transparent", // Esconde o texto do título
      },
    };
  };

  // Configuração do gráfico de evolução de peso
  const weightChartData = [
    ["Data", "Peso"],
    ...(weightData?.weightHistory.map((entry) => [entry.date, entry.weight]) || [])
  ];

  const chartOptions = {
    title: "Evolução do Peso ao Longo do Ano",
    hAxis: { title: "Data" },
    vAxis: { title: "Peso (kg)" },
    legend: "none",
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div style={{ height: 500, width: "100%" }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            dayPropGetter={dayPropGetter}
            eventPropGetter={eventPropGetter} // Adiciona o estilo de fundo transparente para eventos
          />
        </div>
        <div className="mt-4">
          <h3>Detalhes dos Eventos:</h3>
          <p>Média de qualidade de vida: {averageExecutionPercentage}%</p>
          <p>Porcentagem de execução de Dieta no mês: {dietaPercentage}%</p>
          <p>Porcentagem de execução de Exercício no mês: {excercisePercentage}%</p>
          
        </div>
        <div style={{ width: "100%", maxWidth: "600px", marginTop: "2rem" }}>
          <Chart
            chartType="LineChart"
            width="100%"
            height="400px"
            data={weightChartData}
            options={chartOptions}
          />
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        {/* Links do footer */}
        {/* ... */}
      </footer>
    </div>
  );
}
