"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoinGeckoClient } from "@/lib/coingecko";
import { Github } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface NetworkStats {
  scores: Array<{
    id: string;
    score: number;
    adminScore: number;
    epoch: number;
    updated: string;
    checked: string;
    identity: string;
    isComputor: boolean;
  }>;
  minScore: number;
  maxScore: number;
  averageScore: number;
  createdAt: string;
  scoreStatistics: Array<{
    epoch: number;
    daydate: string;
    maxScore: number;
    realMinScore: number;
    minScore: number;
    avgScore: number;
  }>;
  estimatedIts: number;
  solutionsPerHour: number;
  solutionsPerHourCalculated: number;
  difficulty: number;
}

interface EpochInfo {
  epochNumber: number;
  curEpochBegin: Date;
  curEpochEnd: Date;
  curEpochProgress: number;
}

interface Income {
  qubicPrice: number;
  incomePerOneITS: number;
  dailyIncome: number;
  dailyIncomeBySols: number;
  curSolPrice: number;
  dailySolutions: number;
  luckiness: number;
}

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

interface DataPoint {
  time: number;
  EstimatedIts?: number;
  solutionsPerHour?: number;
  TotalCurrent?: number;
  totalScores?: number;
}

const translations: Translations = {
  en: {
    title: "Qubic Income Calculator",
    hashrate: "Your Hashrate (it/s)",
    solsCount: "Your Solutions Count",
    calculate: "Calculate",
    epochInfo: "Current Epoch Information",
    currentEpoch: "Current Epoch",
    epochStart: "Epoch Start (UTC)",
    epochEnd: "Epoch End (UTC)",
    epochProgress: "Epoch Progress",
    networkInfo: "Network Information",
    estimatedHashrate: "Estimated Network Hashrate",
    averageScore: "Average Score",
    solutionsPerHour: "Solutions per Hour",
    incomeEstimate: "Income Estimate (85% Pool)",
    qubicPrice: "Qubic Price",
    dailyIncome: "Estimated Daily Income (Hashrate)",
    dailyIncomeBySols: "Estimated Solutions Income",
    solIncome: "Estimated Income per Solution",
    dailySolutions: "Estimated Daily Solutions",
    luckiness: "Luckiness (Actual/Expected)",
    loading: "Loading...",
    error: "An error occurred. Please try again.",
    pressCalculate: "Press Calculate to see income estimates",
    calculator: "Calculator",
    graph: "Graph",
    donate: "Donate",
    donateInfo: "If you'd like to donate, here are my addresses:",
    qubicAddress: "Qubic Address",
    erc20Address: "ERC-20 Address",
    difficulty: "Difficulty",
    createdAt: "Created At",
    estimatedIts: "Estimated ITs",
    solsPerHour: "Solutions per Hour",
    totalScore: "Total Score",
  },
  zh: {
    title: "Qubic 收益计算器",
    hashrate: "您的算力 (it/s)",
    solsCount: "您的解决方案数量",
    calculate: "计算",
    epochInfo: "目前纪元信息",
    currentEpoch: "目前纪元",
    epochStart: "纪元开始 (UTC)",
    epochEnd: "纪元结束 (UTC)",
    epochProgress: "纪元进度",
    networkInfo: "网络信息",
    estimatedHashrate: "估计网络算力",
    averageScore: "平均分数",
    solutionsPerHour: "每小时解决方案数",
    incomeEstimate: "收益估算 (85% 收益池)",
    qubicPrice: "Qubic 价格",
    dailyIncome: "预计每日收入 (算力)",
    dailyIncomeBySols: "预计 Sol 收入",
    solIncome: "每个解决方案的预计收入",
    dailySolutions: "预计每日解决方案数",
    luckiness: "幸运度 (实际/预期)",
    loading: "加载中...",
    error: "发生错误。请重试。",
    pressCalculate: "点击计算查看收益估算",
    calculator: "计算器",
    graph: "图表",
    donate: "捐赠",
    donateInfo: "如果您想捐赠，这里是我的地址：",
    qubicAddress: "Qubic 地址",
    erc20Address: "ERC-20 地址",
    difficulty: "难度",
    createdAt: "创建于",
    estimatedIts: "估计 ITs",
    solsPerHour: "每小时Solution",
    totalScore: "总分数",
  },
};

export default function QubicCalculator() {
  const [hashrate, setHashrate] = useState<string>("");
  const [solsCount, setSolsCount] = useState<string>("");
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [qubicPrice, setQubicPrice] = useState<number>(0);
  const [itsData, setItsData] = useState<DataPoint[]>([]);
  const [solsData, setSolsData] = useState<DataPoint[]>([]);
  const [scoresData, setScoresData] = useState<DataPoint[]>([]);

  const { theme } = useTheme();

  const t = translations[language];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const loginResponse = await fetch("/api/qubic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: "guest@qubic.li",
          password: "guest13@Qubic.li",
          twoFactorCode: "",
        }),
      });
      const loginData = await loginResponse.json();
      const token = loginData.token;

      const scoreResponse = await fetch(`/api/qubic?token=${token}`);
      const scoreData: NetworkStats = await scoreResponse.json();

      setNetworkStats(scoreData);
      calculateEpochInfo(scoreData);

      const cgClient = new CoinGeckoClient();
      const price = await cgClient.getPrice("qubic-network", "usd");
      setQubicPrice(price);

      // Fetch new graph data
      const itsResponse = await fetch("/api/graph/its");
      const solsResponse = await fetch("/api/graph/sols");
      const scoresResponse = await fetch("/api/graph/scores");

      const itsData = await itsResponse.json();
      const solsData = await solsResponse.json();
      const scoresData = await scoresResponse.json();

      setItsData(itsData);
      setSolsData(solsData);
      setScoresData(scoresData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(t.error);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateEpochInfo = (data: NetworkStats) => {
    const epochNumber = data.scoreStatistics[0].epoch;
    const epoch97Begin = new Date("2024-02-21T12:00:00Z");
    const curEpochBegin = new Date(
      epoch97Begin.getTime() + (epochNumber - 97) * 7 * 24 * 60 * 60 * 1000,
    );
    const curEpochEnd = new Date(
      curEpochBegin.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000,
    );
    const curEpochProgress =
      (Date.now() - curEpochBegin.getTime()) / (7 * 24 * 60 * 60 * 1000);

    setEpochInfo({
      epochNumber,
      curEpochBegin,
      curEpochEnd,
      curEpochProgress,
    });
  };

  const calculateIncome = () => {
    if (!networkStats || !epochInfo || !hashrate || qubicPrice === 0) return;

    const poolReward = 0.85;
    const netHashrate = networkStats.estimatedIts;
    const netAvgScores = networkStats.averageScore;
    const netSolsPerHourCalc = networkStats.solutionsPerHourCalculated;

    const curSolPrice =
      (1 / netAvgScores / 1.1) * 1035500000 * 0.92 * qubicPrice;

    const incomePerOneITS =
      poolReward * qubicPrice * (782000000000 / netHashrate / 7 / 1.06);
    const dailyIncome = Number(hashrate) * incomePerOneITS;

    let dailyIncomeBySols = 0;
    if (solsCount) {
      dailyIncomeBySols = Number(solsCount) * curSolPrice;
    }

    const dailySolutionsCalc =
      (24 * Number(hashrate) * netSolsPerHourCalc) / netHashrate;
    const expectedSols = dailySolutionsCalc * (epochInfo.curEpochProgress * 7);
    const actualSols = Number(solsCount);

    const luckiness = actualSols / expectedSols;

    setIncome({
      qubicPrice,
      incomePerOneITS,
      dailyIncome,
      dailyIncomeBySols,
      curSolPrice,
      dailySolutions: dailySolutionsCalc,
      luckiness,
    });
  };

  const calculateButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      if (calculateButtonRef.current) {
        calculateButtonRef.current.click();
      }
    }, 200);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleString("zh-CN", { timeZone: "UTC" });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "category" as const,
        ticks: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.8)"
              : "rgba(0, 0, 0, 0.8)",
        },
        grid: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.8)"
              : "rgba(0, 0, 0, 0.8)",
        },
        grid: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor:
          theme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
        titleColor:
          theme === "dark" ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)",
        bodyColor:
          theme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
        callbacks: {
          label: function (context: TooltipItem<"line">) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          },
        },
      },
    },
  };

  const getChartColors = () => {
    return {
      borderColor:
        theme === "dark"
          ? "rgba(255, 255, 255, 0.8)"
          : "var(--primary-border-color)",
      backgroundColor:
        theme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "var(--primary-background-color)",
    };
  };

  const itsChartData = {
    labels: itsData.map((d) => formatTimestamp(d.time)),
    datasets: [
      {
        label: "Estimated ITs",
        data: itsData.map((d) => d.EstimatedIts),
        borderJoinStyle: "round" as CanvasLineJoin,
        ...getChartColors(),
      },
    ],
  };

  const solsChartData = {
    labels: solsData.map((d) => formatTimestamp(d.time)),
    datasets: [
      {
        label: "Solutions per Hour",
        data: solsData.map((d) => d.solutionsPerHour),
        borderJoinStyle: "round" as CanvasLineJoin,
        ...getChartColors(),
      },
    ],
  };

  const scoresChartData = {
    labels: scoresData.map((d) => formatTimestamp(d.time)),
    datasets: [
      {
        label: "Total Scores",
        data: scoresData.map((d) => d.totalScores),
        borderJoinStyle: "round" as CanvasLineJoin,
        ...getChartColors(),
      },
    ],
  };

  const scoresChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        ticks: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.8)"
              : "rgba(0, 0, 0, 0.8)",
        },
        grid: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="w-4 h-4 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-grid-small-light dark:bg-grid-small-dark opacity-10" />
      </div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <div className="flex gap-4 items-center">
            <Select
              value={language}
              onValueChange={(value: "en" | "zh") => setLanguage(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
            <ModeToggle />
            <Link
              href="https://github.com/yuemiyuki/qubic-calculator-next"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="icon">
                <Github className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">GitHub</span>
              </Button>
            </Link>
          </div>
        </motion.div>

        <Tabs defaultValue="calculator" className="mb-8">
          <TabsList>
            <TabsTrigger value="calculator">{t.calculator}</TabsTrigger>
            <TabsTrigger value="graph">{t.graph}</TabsTrigger>
            <TabsTrigger value="donate">{t.donate}</TabsTrigger>
          </TabsList>
          <TabsContent value="calculator">
            <div className="grid gap-8 md:grid-cols-2">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader>
                    <CardTitle>{t.hashrate}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Input
                        type="number"
                        value={hashrate}
                        onChange={(e) => setHashrate(e.target.value)}
                        placeholder="Enter your hashrate"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={solsCount}
                        onChange={(e) => setSolsCount(e.target.value)}
                        placeholder={t.solsCount}
                      />
                    </div>
                    <Button
                      ref={calculateButtonRef}
                      onClick={calculateIncome}
                      className="w-full"
                    >
                      {t.calculate}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {epochInfo && (
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                    <CardHeader>
                      <CardTitle>{t.epochInfo}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.currentEpoch}
                            </TableCell>
                            <TableCell>{epochInfo.epochNumber}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.epochStart}
                            </TableCell>
                            <TableCell>
                              {formatDate(epochInfo.curEpochBegin)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.epochEnd}
                            </TableCell>
                            <TableCell>
                              {formatDate(epochInfo.curEpochEnd)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.epochProgress}
                            </TableCell>
                            <TableCell>
                              {(epochInfo.curEpochProgress * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            <div className="grid gap-8 md:grid-cols-2 mt-8">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader>
                    <CardTitle>{t.networkInfo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.estimatedHashrate}
                          </TableCell>
                          <TableCell>
                            {networkStats?.estimatedIts.toLocaleString()} it/s
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.averageScore}
                          </TableCell>
                          <TableCell>
                            {networkStats?.averageScore.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.solutionsPerHour}
                          </TableCell>
                          <TableCell>
                            {networkStats?.solutionsPerHourCalculated.toFixed(
                              2,
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.difficulty}
                          </TableCell>
                          <TableCell>{networkStats?.difficulty}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.createdAt}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              networkStats?.createdAt ?? "",
                            ).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader>
                    <CardTitle>{t.incomeEstimate}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {income ? (
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.qubicPrice}
                            </TableCell>
                            <TableCell>
                              ${income.qubicPrice.toFixed(8)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.dailyIncome}
                            </TableCell>
                            <TableCell>
                              ${income.dailyIncome.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.dailyIncomeBySols}
                            </TableCell>
                            <TableCell>
                              ${income.dailyIncomeBySols.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.solIncome}
                            </TableCell>
                            <TableCell>
                              ${income.curSolPrice.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.dailySolutions}
                            </TableCell>
                            <TableCell>
                              {income.dailySolutions.toFixed(3)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              {t.luckiness}
                            </TableCell>
                            <TableCell>{income.luckiness.toFixed(2)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center">{t.pressCalculate}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
          <TabsContent value="graph">
            <div className="grid gap-6 md:grid-cols-2 mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>{t.estimatedIts}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Line options={chartOptions} data={itsChartData} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.solsPerHour}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Line options={chartOptions} data={solsChartData} />
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>{t.totalScore}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Line options={scoresChartOptions} data={scoresChartData} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="donate">
            <div className="grid gap-8 md:grid-cols-1 mt-8">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardHeader>
                    <CardTitle>{t.donateInfo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.qubicAddress}
                          </TableCell>
                          <TableCell>
                            UOSGCOLKQANTLABVKQWUVZCPIXYBEKQWWGARBDAVSGAGGTWCZZKBDDAEBDXK
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {t.erc20Address}
                          </TableCell>
                          <TableCell>
                            0x9d2b0b8e9C8A3F41415545CF7dB4627b50c52285
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="mt-4 text-center text-red-500">{error}</p>}
      </div>

      <footer className="py-4 text-center border-t relative z-10">
        <p>
          Powered by{" "}
          <Link
            href="https://nextjs.org"
            className="text-primary hover:underline"
          >
            Next.js
          </Link>
        </p>
        <p>
          Made with ❤️ by{" "}
          <Link
            href="https://mdesk.tech"
            className="text-primary hover:underline"
          >
            mdesk.tech
          </Link>
        </p>
      </footer>
    </div>
  );
}
