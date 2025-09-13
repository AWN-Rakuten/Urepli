import { QuantAgentsOrchestrator, createDefaultOrchestrator } from '../workflows/orchestrator';

/**
 * Integration test for the quant agents system
 * Demonstrates the complete workflow from initialization to strategy generation
 */
async function runIntegrationTest(): Promise<void> {
  console.log('🚀 Starting Quant Agents Integration Test...\n');

  let orchestrator: QuantAgentsOrchestrator | null = null;

  try {
    // 1. Initialize orchestrator
    console.log('1️⃣ Initializing orchestrator...');
    orchestrator = createDefaultOrchestrator();
    await orchestrator.initialize();
    await orchestrator.start();
    console.log('✅ Orchestrator initialized and started\n');

    // 2. Check system status
    console.log('2️⃣ Checking system status...');
    const status = orchestrator.getSystemStatus();
    console.log(`   - Running: ${status.isRunning}`);
    console.log(`   - Active Agents: ${status.activeAgents}`);
    console.log(`   - Total Events: ${status.totalEvents}\n`);

    // 3. Check agent statuses
    console.log('3️⃣ Checking agent statuses...');
    const agents = orchestrator.getAgentStatuses();
    for (const agent of agents) {
      console.log(`   - ${agent.name}: ${agent.status} (tasks: ${agent.metrics.tasksCompleted})`);
    }
    console.log();

    // 4. Trigger analysis cycle with mock data
    console.log('4️⃣ Triggering analysis cycle...');
    await orchestrator.triggerAnalysisCycle();
    console.log('✅ Analysis cycle triggered\n');

    // 5. Wait for processing
    console.log('5️⃣ Waiting for processing (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. Check for generated strategies
    console.log('6️⃣ Checking for generated strategies...');
    const strategies = await orchestrator.getStrategyRecommendations();
    console.log(`   - Strategies generated: ${strategies.length}`);
    for (const strategy of strategies.slice(0, 3)) {
      console.log(`   - ${strategy.name} (confidence: ${strategy.confidence?.toFixed(3) || 'N/A'})`);
    }
    console.log();

    // 7. Check for discovered factors
    console.log('7️⃣ Checking for discovered factors...');
    const factors = orchestrator.getFactorDiscoveries(5);
    console.log(`   - Factors discovered: ${factors.length}`);
    for (const factor of factors.slice(0, 3)) {
      console.log(`   - ${factor.name} (novelty: ${factor.noveltyScore?.toFixed(3) || 'N/A'})`);
    }
    console.log();

    // 8. Check knowledge graph
    console.log('8️⃣ Checking knowledge graph...');
    const kgStats = orchestrator.getKnowledgeGraphStats();
    console.log(`   - Entities: ${kgStats.entityCount}`);
    console.log(`   - Relations: ${kgStats.relationCount}`);
    console.log(`   - Entity Types:`, Object.keys(kgStats.entityTypeBreakdown).join(', '));
    console.log();

    // 9. Check recent events
    console.log('9️⃣ Checking recent events...');
    const events = orchestrator.getRecentEvents(10);
    console.log(`   - Recent events: ${events.length}`);
    const eventTypes = [...new Set(events.map(e => e.type))];
    console.log(`   - Event types: ${eventTypes.join(', ')}`);
    console.log();

    // 10. Simulate macro narrative update
    console.log('🔟 Simulating macro narrative update...');
    await orchestrator.updateMacroNarrative(
      'Market volatility increasing with central bank policy divergence creating cross-asset momentum opportunities'
    );
    
    // Wait a bit more for narrative processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for regime changes
    const finalEvents = orchestrator.getRecentEvents(5);
    const regimeEvents = finalEvents.filter(e => e.type.includes('regime'));
    console.log(`   - Regime-related events: ${regimeEvents.length}`);
    console.log();

    // 11. Final system status
    console.log('1️⃣1️⃣ Final system status...');
    const finalStatus = orchestrator.getSystemStatus();
    console.log('   Performance Metrics:');
    console.log(`   - Strategies Generated: ${finalStatus.performanceMetrics.strategiesGenerated}`);
    console.log(`   - Factors Discovered: ${finalStatus.performanceMetrics.factorsDiscovered}`);
    console.log(`   - Risk Assessments: ${finalStatus.performanceMetrics.riskAssessments}`);
    console.log(`   - Regime Changes: ${finalStatus.performanceMetrics.regimeChanges}`);
    console.log();

    console.log('🎉 Integration test completed successfully!\n');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    if (orchestrator) {
      await orchestrator.stop();
      console.log('🛑 Orchestrator stopped');
    }
  }
}

/**
 * Simple unit tests for individual components
 */
async function runUnitTests(): Promise<void> {
  console.log('🧪 Running Unit Tests...\n');

  try {
    // Test event bus
    console.log('Testing Event Bus...');
    const { eventBus } = await import('../infra/event-bus');
    
    let eventReceived = false;
    eventBus.subscribe('test.event', (event) => {
      eventReceived = true;
      console.log(`   ✅ Event received: ${event.type}`);
    }, 'test');
    
    await eventBus.publish('test.event', { test: 'data' }, 'test-publisher');
    
    if (!eventReceived) {
      throw new Error('Event bus test failed - no event received');
    }

    // Test knowledge graph
    console.log('Testing Knowledge Graph...');
    const { knowledgeGraph } = await import('../infra/knowledge-graph');
    
    const entity = knowledgeGraph.addEntity(
      'factor' as any,
      { name: 'Test Factor', type: 'momentum' }
    );
    
    const foundEntity = knowledgeGraph.getEntity(entity.id);
    if (!foundEntity || foundEntity.properties.name !== 'Test Factor') {
      throw new Error('Knowledge graph test failed');
    }
    console.log('   ✅ Knowledge graph working');

    // Test strategy DSL
    console.log('Testing Strategy DSL...');
    const { StrategyValidator } = await import('../dsl/strategy-nodes');
    
    const mockStrategy: any = {
      id: 'test-strategy',
      name: 'Test Strategy',
      description: 'A test strategy',
      components: {
        universe: {
          id: 'test-universe',
          type: 'universe_selector',
          name: 'Test Universe',
          parameters: {
            assetClasses: ['equities']
          }
        },
        signals: [{
          id: 'test-signal',
          type: 'signal_block',
          name: 'Test Signal',
          signalType: 'momentum',
          parameters: { lookbackPeriod: 20, threshold: 2.0 }
        }],
        features: [],
        positionSizer: {
          id: 'test-sizer',
          type: 'position_sizer',
          name: 'Test Sizer',
          sizingType: 'kelly_fraction_capped',
          parameters: { maxPosition: 0.05 }
        },
        riskOverlays: [],
        execution: {
          id: 'test-execution',
          type: 'execution_plan',
          name: 'Test Execution',
          executionType: 'twap_adaptive',
          parameters: { timeHorizon: 60 }
        }
      },
      metadata: {
        created: new Date(),
        lastModified: new Date(),
        author: 'test',
        version: '1.0',
        tags: ['test']
      }
    };
    
    const validation = StrategyValidator.validate(mockStrategy);
    if (!validation.isValid) {
      console.log('   ⚠️ Strategy validation found issues:', validation.errors);
    } else {
      console.log('   ✅ Strategy DSL working');
    }

    // Test originality scoring
    console.log('Testing Originality Scoring...');
    const { originalityAuditor } = await import('../scoring/originality');
    
    const originalityMetrics = await originalityAuditor.getOriginalityMetrics(mockStrategy);
    console.log(`   ✅ Originality metrics calculated (innovation distance: ${originalityMetrics.innovationDistance.toFixed(3)})`);

    console.log('\n🎯 All unit tests passed!\n');

  } catch (error) {
    console.error('❌ Unit tests failed:', error);
    process.exit(1);
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--unit-only')) {
    await runUnitTests();
  } else if (args.includes('--integration-only')) {
    await runIntegrationTest();
  } else {
    await runUnitTests();
    await runIntegrationTest();
  }
  
  console.log('🏆 All tests completed successfully!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { runIntegrationTest, runUnitTests };