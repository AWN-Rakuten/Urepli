import { v4 as uuidv4 } from 'uuid';

export interface Entity {
  id: string;
  type: EntityType;
  properties: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Relation {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  properties: Record<string, any>;
  weight?: number;
  createdAt: Date;
}

export enum EntityType {
  ASSET = 'asset',
  FACTOR = 'factor',
  STRATEGY = 'strategy',
  REGIME = 'regime',
  NARRATIVE = 'narrative',
  SCENARIO = 'scenario',
  VARIANT = 'variant',
  FAILURE_MODE = 'failure_mode'
}

export enum RelationType {
  STRATEGY_USES_FACTOR = 'strategy_uses_factor',
  FACTOR_ACTIVE_IN_REGIME = 'factor_active_in_regime',
  NARRATIVE_EXPLAINS_REGIME = 'narrative_explains_regime',
  STRATEGY_FAILED_UNDER_SCENARIO = 'strategy_failed_under_scenario',
  VARIANT_DIVERGED_FROM = 'variant_diverged_from',
  SIMILAR_TO = 'similar_to',
  CAUSED_BY = 'caused_by',
  INFLUENCES = 'influences'
}

export interface QueryFilter {
  entityTypes?: EntityType[];
  relationTypes?: RelationType[];
  properties?: Record<string, any>;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Knowledge Graph for storing relationships between quant entities
 * Supports semantic search and graph traversal operations
 */
export class KnowledgeGraph {
  private entities: Map<string, Entity> = new Map();
  private relations: Map<string, Relation> = new Map();
  private entityIndex: Map<EntityType, Set<string>> = new Map();
  private relationIndex: Map<RelationType, Set<string>> = new Map();
  
  constructor() {
    // Initialize indices
    for (const entityType of Object.values(EntityType)) {
      this.entityIndex.set(entityType, new Set());
    }
    for (const relationType of Object.values(RelationType)) {
      this.relationIndex.set(relationType, new Set());
    }
  }

  /**
   * Add or update an entity
   */
  addEntity(
    type: EntityType,
    properties: Record<string, any>,
    embedding?: number[]
  ): Entity {
    const id = uuidv4();
    const now = new Date();
    
    const entity: Entity = {
      id,
      type,
      properties,
      embedding,
      createdAt: now,
      updatedAt: now
    };

    this.entities.set(id, entity);
    this.entityIndex.get(type)!.add(id);
    
    return entity;
  }

  /**
   * Update an existing entity
   */
  updateEntity(
    id: string,
    properties: Partial<Record<string, any>>,
    embedding?: number[]
  ): Entity | null {
    const entity = this.entities.get(id);
    if (!entity) return null;

    const updated: Entity = {
      ...entity,
      properties: { ...entity.properties, ...properties },
      embedding: embedding || entity.embedding,
      updatedAt: new Date()
    };

    this.entities.set(id, updated);
    return updated;
  }

  /**
   * Add a relation between entities
   */
  addRelation(
    type: RelationType,
    sourceId: string,
    targetId: string,
    properties: Record<string, any> = {},
    weight?: number
  ): Relation | null {
    // Verify entities exist
    if (!this.entities.has(sourceId) || !this.entities.has(targetId)) {
      return null;
    }

    const id = uuidv4();
    const relation: Relation = {
      id,
      type,
      sourceId,
      targetId,
      properties,
      weight,
      createdAt: new Date()
    };

    this.relations.set(id, relation);
    this.relationIndex.get(type)!.add(id);
    
    return relation;
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): Entity | null {
    return this.entities.get(id) || null;
  }

  /**
   * Find entities by criteria
   */
  findEntities(filter: QueryFilter): Entity[] {
    let entityIds: Set<string> = new Set();

    if (filter.entityTypes && filter.entityTypes.length > 0) {
      for (const type of filter.entityTypes) {
        const typeIds = this.entityIndex.get(type) || new Set();
        entityIds = entityIds.size === 0 
          ? new Set(typeIds) 
          : new Set([...entityIds].filter(id => typeIds.has(id)));
      }
    } else {
      entityIds = new Set(this.entities.keys());
    }

    const results: Entity[] = [];
    for (const id of entityIds) {
      const entity = this.entities.get(id)!;
      
      // Apply property filters
      if (filter.properties) {
        let matches = true;
        for (const [key, value] of Object.entries(filter.properties)) {
          if (entity.properties[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Apply time range filter
      if (filter.timeRange) {
        if (entity.createdAt < filter.timeRange.start || 
            entity.createdAt > filter.timeRange.end) {
          continue;
        }
      }

      results.push(entity);
    }

    return results;
  }

  /**
   * Find relations by criteria
   */
  findRelations(filter: QueryFilter & { sourceId?: string; targetId?: string }): Relation[] {
    let relationIds: Set<string> = new Set();

    if (filter.relationTypes && filter.relationTypes.length > 0) {
      for (const type of filter.relationTypes) {
        const typeIds = this.relationIndex.get(type) || new Set();
        relationIds = relationIds.size === 0 
          ? new Set(typeIds) 
          : new Set([...relationIds].filter(id => typeIds.has(id)));
      }
    } else {
      relationIds = new Set(this.relations.keys());
    }

    const results: Relation[] = [];
    for (const id of relationIds) {
      const relation = this.relations.get(id)!;
      
      // Apply source/target filters
      if (filter.sourceId && relation.sourceId !== filter.sourceId) continue;
      if (filter.targetId && relation.targetId !== filter.targetId) continue;

      // Apply property filters
      if (filter.properties) {
        let matches = true;
        for (const [key, value] of Object.entries(filter.properties)) {
          if (relation.properties[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Apply time range filter
      if (filter.timeRange) {
        if (relation.createdAt < filter.timeRange.start || 
            relation.createdAt > filter.timeRange.end) {
          continue;
        }
      }

      results.push(relation);
    }

    return results;
  }

  /**
   * Get connected entities (graph traversal)
   */
  getConnectedEntities(
    entityId: string,
    relationTypes?: RelationType[],
    maxDepth: number = 2
  ): { entity: Entity; path: Relation[]; depth: number }[] {
    const visited = new Set<string>();
    const results: { entity: Entity; path: Relation[]; depth: number }[] = [];
    
    const traverse = (currentId: string, path: Relation[], depth: number) => {
      if (depth >= maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      // Find all relations from current entity
      const outgoingRelations = this.findRelations({ sourceId: currentId, relationTypes });
      const incomingRelations = this.findRelations({ targetId: currentId, relationTypes });
      
      const allRelations = [...outgoingRelations, ...incomingRelations];

      for (const relation of allRelations) {
        const nextId = relation.sourceId === currentId ? relation.targetId : relation.sourceId;
        if (!visited.has(nextId)) {
          const nextEntity = this.entities.get(nextId);
          if (nextEntity) {
            const newPath = [...path, relation];
            results.push({ entity: nextEntity, path: newPath, depth: depth + 1 });
            traverse(nextId, newPath, depth + 1);
          }
        }
      }
    };

    traverse(entityId, [], 0);
    return results;
  }

  /**
   * Semantic similarity search using embeddings
   */
  findSimilarEntities(
    targetEmbedding: number[],
    entityType?: EntityType,
    limit: number = 10,
    threshold: number = 0.7
  ): { entity: Entity; similarity: number }[] {
    const candidates = entityType 
      ? this.findEntities({ entityTypes: [entityType] })
      : Array.from(this.entities.values());

    const similarities: { entity: Entity; similarity: number }[] = [];

    for (const entity of candidates) {
      if (!entity.embedding) continue;
      
      const similarity = this.cosineSimilarity(targetEmbedding, entity.embedding);
      if (similarity >= threshold) {
        similarities.push({ entity, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    entityCount: number;
    relationCount: number;
    entityTypeBreakdown: Record<string, number>;
    relationTypeBreakdown: Record<string, number>;
  } {
    const entityTypeBreakdown: Record<string, number> = {};
    const relationTypeBreakdown: Record<string, number> = {};

    for (const [type, ids] of this.entityIndex.entries()) {
      entityTypeBreakdown[type] = ids.size;
    }

    for (const [type, ids] of this.relationIndex.entries()) {
      relationTypeBreakdown[type] = ids.size;
    }

    return {
      entityCount: this.entities.size,
      relationCount: this.relations.size,
      entityTypeBreakdown,
      relationTypeBreakdown
    };
  }

  /**
   * Export graph data for persistence
   */
  export(): {
    entities: Entity[];
    relations: Relation[];
  } {
    return {
      entities: Array.from(this.entities.values()),
      relations: Array.from(this.relations.values())
    };
  }

  /**
   * Import graph data from persistence
   */
  import(data: { entities: Entity[]; relations: Relation[] }): void {
    this.clear();
    
    for (const entity of data.entities) {
      this.entities.set(entity.id, entity);
      this.entityIndex.get(entity.type)!.add(entity.id);
    }
    
    for (const relation of data.relations) {
      this.relations.set(relation.id, relation);
      this.relationIndex.get(relation.type)!.add(relation.id);
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.entities.clear();
    this.relations.clear();
    
    for (const set of this.entityIndex.values()) {
      set.clear();
    }
    for (const set of this.relationIndex.values()) {
      set.clear();
    }
  }
}

// Global knowledge graph instance
export const knowledgeGraph = new KnowledgeGraph();